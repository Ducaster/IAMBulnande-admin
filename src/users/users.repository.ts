import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DynamoDBService } from '../database/dynamodb.service';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersRepository {
  constructor(
    private dynamoDBService: DynamoDBService,
    private configService: ConfigService,
  ) {}

  private getTableName(): string {
    return this.configService.get<string>('DYNAMODB_TABLE_USERS');
  }

  async createUser(user: any) {
    const tableName = this.getTableName();
    const params = {
      TableName: tableName,
      Item: {
        PK: `USER#${user.uid}`,
        SK: 'METADATA',
        uid: user.uid,
        id: user.id,
        password: user.password,
        category: user.category,
      },
    };

    try {
      await this.dynamoDBService.getClient().send(new PutCommand(params));
    } catch (error) {
      console.error('사용자 생성 중 오류 발생:', error);
      throw error;
    }
  }

  async login(id: string, password: string) {
    const tableName = this.getTableName();
    const params = {
      TableName: tableName,
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': id,
      },
    };

    const result = await this.dynamoDBService
      .getClient()
      .send(new ScanCommand(params));
    const user = result.Items?.[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { message: 'Login successful', uid: user.uid };
  }

  async createInitialUser(user: any) {
    const tableName = this.getTableName();
    const command = new PutCommand({
      TableName: tableName,
      Item: {
        PK: `USER#${user.uid}`,
        SK: 'METADATA',
        uid: user.uid,
        name: user.name,
        secret: user.secret,
        category: user.category,
      },
    });
    return this.dynamoDBService.getClient().send(command);
  }

  async findByName(name: string) {
    const tableName = this.getTableName();
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: '#name = :name',
      ExpressionAttributeNames: {
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':name': name,
      },
    });
    const result = await this.dynamoDBService.getClient().send(command);
    return result.Items?.[0] || null;
  }

  async findByUid(uid: string) {
    if (!uid) {
      return { Item: null };
    }

    const tableName = this.getTableName();
    const command = new GetCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${uid}`,
        SK: 'METADATA',
      },
    });
    return await this.dynamoDBService.getClient().send(command);
  }

  async updateRefreshToken(uid: string, refreshToken: string) {
    const tableName = this.getTableName();
    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${uid}`,
        SK: 'METADATA',
      },
      UpdateExpression: 'SET refreshToken = :rt',
      ExpressionAttributeValues: {
        ':rt': refreshToken,
      },
    });
    return this.dynamoDBService.getClient().send(command);
  }

  async findById(id: string) {
    const tableName = this.getTableName();
    const params = {
      TableName: tableName,
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': id,
      },
    };

    const result = await this.dynamoDBService
      .getClient()
      .send(new ScanCommand(params));
    return result.Items?.[0];
  }
}
