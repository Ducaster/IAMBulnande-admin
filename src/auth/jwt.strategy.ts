import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
    console.log(
      'JWT 전략 초기화됨, 시크릿 키:',
      configService.get('JWT_SECRET').substring(0, 3) + '...',
    );
  }

  async validate(payload: any) {
    console.log('JWT 검증 중:', payload);
    const { uid } = payload;
    const user = await this.usersRepository.findByUid(uid);

    if (!user.Item) {
      console.log('사용자를 찾을 수 없음:', uid);
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }

    console.log('인증된 사용자:', user.Item.uid);
    return user.Item;
  }
}
