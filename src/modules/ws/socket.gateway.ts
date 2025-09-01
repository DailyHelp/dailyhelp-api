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
  }

  offerCountered(payload: any) {
    this.server
      .to(convRoom(payload.conversationUuid))
      .emit('offer:countered', payload);
    this.server.to(userRoom(payload.toUuid)).emit('offer:countered', payload);
  }

  offerUpdated(payload: {
    uuid: string;
    conversationUuid: string;
    status: string;
  }) {
    this.server
      .to(convRoom(payload.conversationUuid))
      .emit('offer:updated', payload);
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
  }
}
