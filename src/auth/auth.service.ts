import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private generateUID(): string {
    return uuidv4();
  }

  async registerUser(id: string, password: string) {
    // 아이디 중복 확인
    const existingUser = await this.usersRepository.findById(id);
    if (existingUser) {
      throw new UnauthorizedException('ID already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      uid: this.generateUID(),
      id,
      password: hashedPassword,
    };

    await this.usersRepository.createUser(newUser);
    return { message: 'User registered successfully', id };
  }

  async register(userDto: any) {
    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    const user = { ...userDto, password: hashedPassword };

    await this.usersRepository.createUser(user);
    return { message: 'User registered successfully' };
  }

  async login(id: string, password: string) {
    const user = await this.usersRepository.login(id, password);
    const tokens = this.generateTokens(user.uid);
    return {
      ...tokens,
      uid: user.uid,
    };
  }

  generateTokens(uid: string) {
    const randomValue = Math.random().toString(36).substring(2, 15);
    const accessToken = this.jwtService.sign(
      { uid, randomValue },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { uid, randomValue },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN'),
      },
    );

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const accessToken = this.jwtService.sign(
        {
          uid: decoded.uid,
          randomValue: Math.random().toString(36).substring(2, 15),
        },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN'),
        },
      );

      return {
        accessToken,
        refreshToken,
        uid: decoded.uid,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async createInitialUser(name: string, secret: string) {
    // 이미 존재하는 사용자인지 확인
    const existingUser = await this.usersRepository.findByName(name);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const uid = this.generateUID();
    const user = {
      name,
      secret,
      uid,
    };

    await this.usersRepository.createInitialUser(user);
    return { uid };
  }

  async updateRefreshToken(uid: string, refreshToken: string) {
    const userResult = await this.usersRepository.findByUid(uid);
    if (!userResult.Item) {
      throw new UnauthorizedException('User not found');
    }

    await this.usersRepository.updateRefreshToken(uid, refreshToken);
    return { message: 'Refresh token updated successfully' };
  }
}
