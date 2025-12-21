import { Inject, Injectable, Logger, UseGuards, forwardRef } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { WsJwtGuard } from 'src/guards/ws-jwt-guard';
import { Server, Socket } from 'socket.io';
import { ReadStateService } from './read-state.service';
import { PresenceService } from './presence.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as jwt from 'jsonwebtoken';
import { ConfigType } from '@nestjs/config';
import { JwtAuthConfiguration } from 'src/config/configuration';
import { JobService } from '../jobs/jobs.service';
import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Conversation } from '../conversations/conversations.entity';

type WSUser = { uuid: string; userType: string; email?: string };

const userRoom = (u: string) => `user:${u}`;
const convRoom = (c: string) => `conv:${c}`;

@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
@UseGuards(WsJwtGuard)
@Injectable()
export class SocketGateway {
  private readonly logger = new Logger(SocketGateway.name);

  @WebSocketServer() server: Server;
  constructor(
    private readonly readState: ReadStateService,
    private readonly presence: PresenceService,
    private readonly notify: NotificationsService,
    @Inject(JwtAuthConfiguration.KEY)
    private readonly jwtConfig: ConfigType<typeof JwtAuthConfiguration>,
    @Inject(forwardRef(() => JobService))
    private readonly jobService: JobService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: EntityRepository<Conversation>,
  ) {}

  private async getRoomSize(room: string) {
    try {
      const sockets = await this.server.in(room).fetchSockets();
      return sockets.length;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch sockets for room=${room}: ${(error as Error)?.message || error}`,
      );
      return 0;
    }
  }

  private getClientUser(client: Socket): WSUser | null {
    let user: WSUser | undefined = (client as any).user;
    if (!user?.uuid) {
      const token =
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) {
        this.logger.warn(`Socket ${client.id} missing authenticated user metadata`);
        return null;
      }
      try {
        const payload = jwt.verify(token, this.jwtConfig.secretKey) as any;
        user = {
          uuid: payload.uuid,
          userType: payload.userType,
          email: payload.email,
        };
        (client as any).user = user;
      } catch (error) {
        this.logger.warn(
          `Socket ${client.id} provided invalid token: ${(error as Error).message}`,
        );
        return null;
      }
    }
    return user;
  }

  async handleConnection(client: Socket) {
    const user = this.getClientUser(client);
    if (!user) {
      client.disconnect(true);
      return;
    }
    const room = userRoom(user.uuid);
    await client.join(room);
    const count = await this.presence.addConnection(user.uuid, client.id);
    const socketsInRoom = await this.getRoomSize(room);
    this.logger.log(
      `WS connected → user=${user.uuid}, room=${room}, socketsInRoom=${socketsInRoom}, presenceConnections=${count}`,
    );
    if (count === 1) {
      this.server.emit('presence:update', {
        userUuid: user.uuid,
        online: true,
        at: new Date().toISOString(),
      });
    }
  }

  async handleDisconnect(client: Socket) {
    const user = this.getClientUser(client);
    if (!user) return;
    const count = await this.presence.removeConnection(user.uuid, client.id);
    if (count === 0) {
      this.server.emit('presence:update', {
        userUuid: user.uuid,
        online: false,
        at: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @MessageBody() data: { conversationUuid: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(convRoom(data.conversationUuid));
    client.emit('conversation:joined', {
      conversationUuid: data.conversationUuid,
    });
  }

  @SubscribeMessage('conversation:leave')
  async leaveConversation(
    @MessageBody() data: { conversationUuid: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(convRoom(data.conversationUuid));
    client.emit('conversation:left', {
      conversationUuid: data.conversationUuid,
    });
  }

  @SubscribeMessage('message:read')
  async onMessageRead(
    @MessageBody() data: { messageUuid: string; conversationUuid: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getClientUser(client);
    if (!user) return;
    await this.readState.markMessageRead(
      user.uuid,
      data.messageUuid,
      data.conversationUuid,
    );
  }

  @SubscribeMessage('conversation:read')
  async onConversationRead(
    @MessageBody() data: { conversationUuid: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getClientUser(client);
    if (!user) return;
    await this.readState.markConversationRead(user.uuid, data.conversationUuid);
  }

  conversationCreated(payload: {
    uuid: string;
    serviceProviderUuid: string;
    serviceRequestorUuid: string;
    lastMessage?: any;
    createdAt: string | Date;
  }) {
    this.server
      .to(userRoom(payload.serviceProviderUuid))
      .emit('conversation:created', payload);
    this.server
      .to(userRoom(payload.serviceRequestorUuid))
      .emit('conversation:created', payload);

    this.notify.sendToUserUuids(
      [payload.serviceProviderUuid, payload.serviceRequestorUuid],
      {
        title: 'New Conversation',
        body: 'A new conversation was started',
        data: { type: 'CONVERSATION_CREATED', conversationUuid: String(payload.uuid) },
      },
    );
  }

  conversationUpdated(payload: {
    uuid: string;
    serviceProviderUuid: string;
    serviceRequestorUuid: string;
    lastMessageUuid?: string | null;
    locked?: boolean;
    restricted?: boolean;
    cancellationChances?: number;
  }) {
    this.server
      .to(convRoom(payload.uuid))
      .emit('conversation:updated', payload);
    this.server
      .to(userRoom(payload.serviceProviderUuid))
      .emit('conversation:updated', payload);
    this.server
      .to(userRoom(payload.serviceRequestorUuid))
      .emit('conversation:updated', payload);

    this.notify.sendToUserUuids(
      [payload.serviceProviderUuid, payload.serviceRequestorUuid],
      {
        title: 'Conversation Updated',
        body: 'Conversation state has changed',
        data: { type: 'CONVERSATION_UPDATED', conversationUuid: String(payload.uuid) },
        silent: true,
      },
    );
  }

  messageCreated(payload: {
    uuid: string;
    conversationUuid: string;
    fromUuid: string;
    toUuid: string;
    message?: string;
    type: string;
    createdAt: string | Date;
  }) {
    this.server
      .to(convRoom(payload.conversationUuid))
      .emit('message:created', payload);
    this.server.to(userRoom(payload.toUuid)).emit('inbox:badge', {
      conversationUuid: payload.conversationUuid,
      lastMessageSnippet: (payload.message ?? '').slice(0, 120),
    });

    // Push notification to recipient
    this.notify.sendToUserUuids(
      [payload.toUuid],
      {
        title: 'New message',
        body: payload.message || 'You have a new message',
        data: {
          type: 'MESSAGE',
          payload: JSON.stringify(payload),
        },
      },
      payload.fromUuid,
    );
  }

  messageRead(payload: {
    conversationUuid: string;
    messageUuid: string;
    readerUuid: string;
    readAt: string;
  }) {
    this.server
      .to(convRoom(payload.conversationUuid))
      .emit('message:read', payload);
  }

  conversationRead(payload: {
    conversationUuid: string;
    readerUuid: string;
    unreadCount: number;
    readAt: string;
  }) {
    this.server
      .to(convRoom(payload.conversationUuid))
      .emit('conversation:read', payload);
    this.server.emit('conversation:read', payload);
  }

  offerCreated(payload: {
    uuid: string;
    conversationUuid: string;
    fromUuid: string;
    toUuid: string;
    price: number;
    status: string;
  }) {
    this.server
      .to(convRoom(payload.conversationUuid))
      .emit('offer:created', payload);
    this.server.to(userRoom(payload.toUuid)).emit('offer:created', payload);

    this.notify.sendToUserUuids(
      [payload.toUuid],
      {
        title: 'New offer',
        body: `You received an offer of ₦${payload.price}`,
        data: {
          type: 'OFFER_CREATED',
          payload: JSON.stringify(payload),
        },
      },
      payload.fromUuid,
    );
  }

  offerCountered(payload: any) {
    this.server
      .to(convRoom(payload.conversationUuid))
      .emit('offer:countered', payload);
    this.server.to(userRoom(payload.toUuid)).emit('offer:countered', payload);

    if (payload?.toUuid) {
      this.notify.sendToUserUuids(
        [payload.toUuid],
        {
          title: 'Offer countered',
          body: 'Your offer has a counter-offer',
          data: {
            type: 'OFFER_COUNTERED',
            payload: JSON.stringify(payload),
          },
        },
        payload?.fromUuid,
      );
    }
  }

  offerUpdated(payload: {
    uuid: string;
    conversationUuid: string;
    status: string;
  }) {
    this.server
      .to(convRoom(payload.conversationUuid))
      .emit('offer:updated', payload);

    // Notify both participants in the conversation
    this.notify.notifyConversationParticipants(payload.conversationUuid, {
      title: 'Offer updated',
      body: `Offer status: ${payload.status}`,
      data: {
        type: 'OFFER_UPDATED',
        payload: JSON.stringify(payload),
      },
    });
  }

  @SubscribeMessage('job:share-code')
  async onJobCodeShare(
    @MessageBody() data: { jobUuid: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getClientUser(client);
    if (!user) return;
    if (!data?.jobUuid) {
      client.emit('job:code-share:error', {
        message: 'jobUuid is required',
      });
      return;
    }

    try {
      await this.jobService.shareJobCode(data.jobUuid, user as any);
      client.emit('job:code-share:success', {
        jobUuid: data.jobUuid,
        at: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      this.logger.warn(
        `job:share-code failed for ${user.uuid}: ${err?.message || err}`,
      );
      client.emit('job:code-share:error', {
        message: err?.message || 'Unable to share job code',
      });
    }
  }

  jobCreated(payload: {
    uuid: string;
    conversationUuid?: string;
    serviceProviderUuid: string;
    serviceRequestorUuid: string;
    price?: number;
    status: string;
  }) {
    if (payload.conversationUuid)
      this.server
        .to(convRoom(payload.conversationUuid))
        .emit('job:created', payload);
    this.server
      .to(userRoom(payload.serviceProviderUuid))
      .emit('job:created', payload);
    this.server
      .to(userRoom(payload.serviceRequestorUuid))
      .emit('job:created', payload);

    const body = payload.price
      ? `Job created • ₦${payload.price}`
      : 'Job created';
    this.notify.sendToUserUuids(
      [payload.serviceProviderUuid, payload.serviceRequestorUuid],
      {
        title: 'Job Created',
        body,
        data: {
          type: 'JOB_CREATED',
          payload: JSON.stringify(payload),
        },
      },
    );
  }

  jobUpdated(payload: {
    uuid: string;
    conversationUuid?: string;
    serviceProviderUuid: string;
    serviceRequestorUuid: string;
    status: string;
  }) {
    if (payload.conversationUuid)
      this.server
        .to(convRoom(payload.conversationUuid))
        .emit('job:updated', payload);
    this.server
      .to(userRoom(payload.serviceProviderUuid))
      .emit('job:updated', payload);
    this.server
      .to(userRoom(payload.serviceRequestorUuid))
      .emit('job:updated', payload);

    this.notify.sendToUserUuids(
      [payload.serviceProviderUuid, payload.serviceRequestorUuid],
      {
        title: 'Job Updated',
        body: `Status: ${payload.status}`,
        data: {
          type: 'JOB_UPDATED',
          payload: JSON.stringify(payload),
        },
      },
    );
  }

  jobCodeShared(payload: {
    uuid: string;
    serviceProviderUuid: string;
    serviceRequestorUuid?: string;
    code: string;
  }) {
    this.server
      .to(userRoom(payload.serviceProviderUuid))
      .emit('job:code-shared', payload);

    this.notify.sendToUserUuids(
      [payload.serviceProviderUuid],
      {
        title: 'Job Code',
        body: `Job code: ${payload.code}`,
        data: {
          type: 'JOB_CODE_SHARED',
          payload: JSON.stringify(payload),
        },
      },
    );
  }

  @SubscribeMessage('call:incoming:trigger')
  async onCallIncomingTrigger(
    @MessageBody()
    data: {
      conversationUuid?: string;
      appId?: string;
      channel?: string;
      token?: string;
      uid?: number;
      expiresAt?: string;
      ttlSeconds?: number;
      data?: {
        appId?: string;
        channel?: string;
        token?: string;
        uid?: number;
        expiresAt?: string;
        ttlSeconds?: number;
        conversationUuid?: string;
        jobUuid?: string;
      };
      jobUuid?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getClientUser(client);
    if (!user) return;

    const payload = data?.data?.channel ? data.data : data;
    const conversationUuid =
      data?.conversationUuid || payload?.conversationUuid;
    const appId = payload?.appId;
    const channel = payload?.channel;
    const token = payload?.token;
    const uid = payload?.uid;
    const expiresAt = payload?.expiresAt;
    const ttlSeconds = payload?.ttlSeconds;
    const jobUuid =
      payload?.jobUuid ||
      (typeof channel === 'string' && channel.startsWith('job-')
        ? channel.slice(4)
        : undefined);

    if (
      !conversationUuid ||
      !appId ||
      !channel ||
      !token ||
      uid === undefined ||
      uid === null ||
      ttlSeconds === undefined ||
      ttlSeconds === null ||
      !expiresAt
    ) {
      client.emit('call:incoming:error', {
        message: 'Incomplete call payload',
      });
      return;
    }

    const conversation = await this.conversationRepository.findOne(
      { uuid: conversationUuid },
      { populate: ['serviceProvider', 'serviceRequestor'] },
    );
    if (!conversation) {
      client.emit('call:incoming:error', { message: 'Conversation not found' });
      return;
    }

    const providerUuid = conversation.serviceProvider?.uuid;
    const requestorUuid = conversation.serviceRequestor?.uuid;
    if (!providerUuid || !requestorUuid) {
      client.emit('call:incoming:error', {
        message: 'Conversation participants not found',
      });
      return;
    }

    if (user.uuid !== providerUuid && user.uuid !== requestorUuid) {
      client.emit('call:incoming:error', {
        message: 'You are not a participant in this conversation',
      });
      return;
    }

    const toUuid = user.uuid === providerUuid ? requestorUuid : providerUuid;
    const buildName = (u?: {
      firstname?: string | null;
      lastname?: string | null;
      email?: string | null;
      phone?: string | null;
      uuid?: string;
    }) => {
      const full = [u?.firstname, u?.lastname]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (full) return full;
      return u?.email || u?.phone || u?.uuid || null;
    };

    const callerDetails =
      user.uuid === providerUuid
        ? conversation.serviceProvider
        : conversation.serviceRequestor;
    const fromName =
      buildName(callerDetails) || user.email || user.uuid || 'Someone';

    try {
      await this.callInitiated({
        conversationUuid,
        jobUuid,
        fromUuid: user.uuid,
        toUuid,
        fromName,
        appId: String(appId),
        channel: String(channel),
        token: String(token),
        uid: Number(uid),
        expiresAt: String(expiresAt),
        ttlSeconds: Number(ttlSeconds),
      });
      client.emit('call:incoming:dispatched', {
        conversationUuid,
        toUuid,
        jobUuid,
        channel,
        at: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      this.logger.warn(
        `call:incoming:trigger failed for ${user.uuid}: ${err?.message || err}`,
      );
      client.emit('call:incoming:error', {
        message: err?.message || 'Unable to emit call:incoming',
      });
    }
  }

  async callInitiated(payload: {
    conversationUuid: string;
    jobUuid?: string;
    fromUuid: string;
    toUuid: string;
    fromName: string;
    appId: string;
    channel: string;
    token: string;
    uid: number;
    expiresAt: string;
    ttlSeconds: number;
  }) {
    const room = userRoom(payload.toUuid);
    const sockets = await this.server.in(room).fetchSockets();
    const socketsInRoom = sockets.length;
    const socketIds = sockets.map((s) => s.id);
    this.logger.log(
      `Emitting call:incoming → to=${payload.toUuid} room=${room} sockets=${socketsInRoom} socketIds=${socketIds.join(',')} from=${payload.fromUuid} conversation=${payload.conversationUuid}`,
    );
    // Temporary: broadcast globally for testing (instead of only the target room)
    this.server.emit('call:incoming', payload);
    if (socketsInRoom === 0) {
      this.logger.warn(
        `call:incoming emitted but no active sockets in room=${room} for user=${payload.toUuid}`,
      );
    }

    const callerName = payload.fromName || 'Someone';
    const body = `${callerName} is calling you`;

    this.notify.sendToUserUuids(
      [payload.toUuid],
      {
        title: 'Incoming call',
        body,
        data: {
          type: 'CALL_INCOMING',
          conversationUuid: payload.conversationUuid,
          jobUuid: payload.jobUuid,
          channel: payload.channel,
          uid: String(payload.uid),
          expiresAt: payload.expiresAt,
          callerName,
        },
      },
      payload.fromUuid,
    );
  }
}
