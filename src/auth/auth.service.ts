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

  async verifyUser(name: string, secret: string) {
    const user = await this.usersRepository.findByName(name);
    console.log('Found user:', user); // 디버깅을 위한 로그

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.secret === secret) {
      return { uid: user.uid };
    }

    throw new UnauthorizedException('Invalid secret');
  }

  async registerUser(uid: string, id: string, password: string) {
    const userResult = await this.usersRepository.findByUid(uid);
    const user = userResult.Item;

    if (!user) {
      throw new UnauthorizedException('Invalid UID');
    }

    const existingUserWithId = await this.usersRepository.findById(id);
    if (existingUserWithId.Item) {
      throw new UnauthorizedException('ID already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = {
      ...user,
      id,
      password: hashedPassword,
    };

    await this.usersRepository.updateUser(uid, updatedUser);
    return { message: 'User registered successfully' };
  }

  async register(userDto: any) {
    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    const user = { ...userDto, password: hashedPassword };

    await this.usersRepository.createUser(user);
    return { message: 'User registered successfully' };
  }

  async login(id: string, password: string) {
    // 1단계: id와 password로 사용자 찾기
    console.log('id:', id);
    const userResult = await this.usersRepository.findById(id);
    console.log('Found user by ID:', userResult); // 디버깅 로그

    const user = userResult.Item;
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isPasswordValid); // 디버깅 로그

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // 2단계: uid로 사용자 정보 다시 조회
    const userByUid = await this.usersRepository.findByUid(user.uid);
    console.log('Found user by UID:', userByUid.Item); // 디버깅 로그

    if (!userByUid.Item) {
      throw new UnauthorizedException('User not found by UID');
    }

    // 3단계: uid로 토큰 생성 및 저장
    const tokens = this.generateTokens(user.uid);
    // 리프레시 토큰만 DB에 저장
    await this.usersRepository.updateRefreshToken(
      user.uid,
      tokens.refreshToken,
    );

    return {
      ...tokens,
      uid: user.uid,
    };
  }

  generateTokens(uid: string) {
    const accessToken = this.jwtService.sign(
      { uid },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { uid },
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

      // 액세스 토큰만 새로 생성
      const accessToken = this.jwtService.sign(
        { uid: decoded.uid },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN'),
        },
      );

      return {
        accessToken,
        refreshToken, // 기존 리프레시 토큰 그대로 반환
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
