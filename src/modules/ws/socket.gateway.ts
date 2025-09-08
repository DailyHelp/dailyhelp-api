import { Injectable, UseGuards } from '@nestjs/common';
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

type WSUser = { uuid: string; userType: string; email?: string };

const userRoom = (u: string) => `user:${u}`;
const convRoom = (c: string) => `conv:${c}`;

@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
@UseGuards(WsJwtGuard)
@Injectable()
export class SocketGateway {
  @WebSocketServer() server: Server;
  constructor(
    private readonly readState: ReadStateService,
    private readonly presence: PresenceService,
    private readonly notify: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    const user: WSUser = (client as any).user;
    client.join(userRoom(user.uuid));
    const count = await this.presence.addConnection(user.uuid, client.id);
    if (count === 1) {
      this.server.emit('presence:update', {
        userUuid: user.uuid,
        online: true,
        at: new Date().toISOString(),
      });
    }
  }

  async handleDisconnect(client: Socket) {
    const user: WSUser = (client as any).user;
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
    const user: WSUser = (client as any).user;
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
    const user: WSUser = (client as any).user;
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
}
