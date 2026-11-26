import{ReceiptQueueService}from'./receipt-queue.service';
import{CareCommandService}from'./care-command.service';
import{ClinicalQueueService}from'./clinical-queue.service';import{CareQueueService}from'./care-queue.service';
import{PatientAppointmentsService}from'./patient-appointments.service';
import{ScheduleQueueService}from'./schedule-queue.service';
import{VisitQueueService}from'./visit-queue.service';
import{AppointmentQueueService}from'./appointment-queue.service';
import{FrontdeskIdentityService}from'./frontdesk-identity.service';
import{FollowupJournalService}from'./followup-journal.service';
import{LabHistoryService}from'./lab-history.service';
import{ImageHistoryService}from'./image-history.service';
import{FollowupQueueService}from'./followup-queue.service';
import{ClinicalHistoryService}from'./clinical-history.service';
import {PatientService} from './patient.service';import {PatientController} from './patient.controller';
import 'reflect-metadata';
import { Module, Controller, Get, Post, Body, Param, Query, Req, Res, Inject, Injectable, UnauthorizedException, ForbiddenException, ServiceUnavailableException, HttpException, HttpStatus } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { DatabaseService } from './database.service';
import { dateInput, uuidInput, changeInput } from './domain';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { FrontdeskService } from './frontdesk.service';
import { FrontdeskController } from './frontdesk.controller';
import { ClinicalService } from './clinical.service';
import { ClinicalController } from './clinical.controller';
import { CareService } from './care.service';
import { CareController } from './care.controller';
import { FollowupService } from './followup.service';
import { FollowupController } from './followup.controller';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { QuarterService } from './quarter.service';
import { QuarterController } from './quarter.controller';
import { QualityService } from './quality.service';
import { QualityController } from './quality.controller';
import { ReceiptService } from './receipt.service';
import { ReceiptController } from './receipt.controller';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { ClinicService } from './clinic.service';
import { ClinicController } from './clinic.controller';
import { DentistService } from './dentist.service';
import { DentistController } from './dentist.controller';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { QualificationService } from './qualification.service';
import { QualificationController } from './qualification.controller';
import {PatientRequestRetirementService} from './patient-request-retirement.service';
import {MiniProgramController,MiniProgramLocalAuth} from './miniprogram.controller';
import {MpPublicController} from './mp-public.controller';import {MpPublicAuth} from './mp-public.auth';
import{proxyPolicy}from'./proxy-policy';

@Injectable()
export class LocalSessionService {
  private sessions = new Map<string, number>();
  private attempts = new Map<string, { count: number; until: number }>();
  assertOrigin(req: Request) {
    if (req.headers.origin !== (process.env.ADMIN_ORIGIN || 'http://127.0.0.1:5173')) throw new ForbiddenException('写入请求来源不受允许。');
  }
  login(req: Request, res: Response, body: unknown) {
    this.assertOrigin(req);
    const ip = req.ip || 'local'; const now = Date.now(); const attempts = this.attempts.get(ip);
    if (attempts && attempts.until > now && attempts.count >= 8) throw new HttpException('尝试过多，请一分钟后再试。', HttpStatus.TOO_MANY_REQUESTS);
    const password = body && typeof body === 'object' ? (body as Record<string,unknown>).password : undefined;
    const actual = createHash('sha256').update(typeof password === 'string' ? password : '').digest();
    const configured = process.env.ADC_LOCAL_ADMIN_PASSWORD;
    if (!configured || !timingSafeEqual(actual, createHash('sha256').update(configured).digest())) {
      this.attempts.set(ip, { count: attempts && attempts.until > now ? attempts.count + 1 : 1, until: now + 60_000 });
      throw new UnauthorizedException('本机开发密码不正确。');
    }
    this.attempts.delete(ip);
    const sid = randomBytes(32).toString('hex');
    for (const [key,expires] of this.sessions) if (expires < now) this.sessions.delete(key);
    this.sessions.set(sid, now + 2*60*60_000);
    res.cookie('adc_probe_session', sid, { httpOnly: true, sameSite: 'strict', secure: false, maxAge: 2*60*60_000, path: '/api' });
    return { name: '本机技术账号', scope: 'technical-probe-only', authenticated: true };
  }
  private id(req: Request) { return (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('adc_probe_session='))?.slice('adc_probe_session='.length) || ''; }
  check(req: Request) { const id = this.id(req); if (!/^[0-9a-f]{64}$/.test(id) || (this.sessions.get(id) || 0) < Date.now()) throw new UnauthorizedException('请先登录本机技术账号。'); }
  logout(req: Request, res: Response) { this.assertOrigin(req); this.sessions.delete(this.id(req)); res.clearCookie('adc_probe_session', { path: '/api' }); return { success: true }; }
}

@Controller('api')
class ProbeController {
  constructor(@Inject(DatabaseService) private db: DatabaseService, @Inject(LocalSessionService) private sessions: LocalSessionService) {}
  @Get('health') async health() { try { return { status: 'ok', stage: 'technical-probe', database: await this.db.health(), baseline: 166, demoDate: process.env.DEMO_DATE }; } catch { throw new ServiceUnavailableException('数据库暂不可用，请检查本地数据库进程。'); } }
  @Get('public/doctors') doctors() { return this.db.doctors(); }
  @Get('public/schedules') schedules(@Query('date') date: unknown, @Query('doctorId') doctorId: unknown) { return this.db.schedules(dateInput(date), doctorId ? uuidInput(doctorId) : undefined, false); }
  @Get('admin/session') session(@Req() req: Request) { this.sessions.check(req); return { authenticated: true, name: '本机技术账号' }; }
  @Post('admin/session') login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: unknown) { return this.sessions.login(req,res,body); }
  @Post('admin/logout') logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.sessions.logout(req,res); }
  @Get('admin/schedules') adminSchedules(@Req() req: Request, @Query('date') date: unknown, @Query('doctorId') doctorId: unknown) { this.sessions.check(req); return this.db.schedules(dateInput(date), doctorId ? uuidInput(doctorId) : undefined, true); }
  @Post('admin/schedules/:id/status') change(@Req() req: Request, @Param('id') id: unknown, @Body() body: unknown) { this.sessions.assertOrigin(req); this.sessions.check(req); return this.db.change(uuidInput(id), changeInput(body)); }
}
@Module({ controllers: [MiniProgramController,MpPublicController,PatientController,QualificationController,SecurityController,ProbeController,BookingController,FrontdeskController,ClinicalController,CareController,FollowupController,InventoryController,SalesController,QuarterController,QualityController,ReceiptController,BusinessController,ClinicController,DentistController], providers: [PatientRequestRetirementService,MiniProgramLocalAuth,MpPublicAuth,ReceiptQueueService,CareCommandService,CareQueueService,ClinicalQueueService,PatientAppointmentsService,ScheduleQueueService,VisitQueueService,AppointmentQueueService,FrontdeskIdentityService,LabHistoryService,ImageHistoryService,FollowupJournalService,FollowupQueueService,ClinicalHistoryService,PatientService,QualificationService,SecurityService,DatabaseService, LocalSessionService,AuthService,BookingService,FrontdeskService,ClinicalService,CareService,FollowupService,InventoryService,SalesService,QuarterService,QualityService,ReceiptService,BusinessService,ClinicService,DentistService] })
class AppModule {}
export async function createApp({ shutdownHooks = true }: { shutdownHooks?: boolean } = {}) {
  const policy=proxyPolicy();
  const app = await NestFactory.create(AppModule, { logger: ['error','warn'] });
  try{await app.get(AuthService).assertExperience();}catch(error){await app.close();throw error;}
  app.getHttpAdapter().getInstance().set('trust proxy',policy.trust);
  app.use((req: Request, res: Response, next: (error?:unknown) => void) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options','nosniff');try{policy.validate(req);next();}catch(error){next(error);} });
  if (shutdownHooks) app.enableShutdownHooks();
  return app;
}
