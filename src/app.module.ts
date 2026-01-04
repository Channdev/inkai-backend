import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { ReportsModule } from './reports/reports.module';
import { TemplatesModule } from './templates/templates.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { ActivityModule } from './activity/activity.module';
import { ExportsModule } from './exports/exports.module';
import { AiModule } from './ai/ai.module';
import { UploadModule } from './upload/upload.module';
import { OAuthModule } from './oauth/oauth.module';
import { PaypalModule } from './paypal/paypal.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
    CommonModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    ReportsModule,
    TemplatesModule,
    SubscriptionsModule,
    PaymentsModule,
    ActivityModule,
    ExportsModule,
    AiModule,
    UploadModule,
    OAuthModule,
    PaypalModule,
    AdminModule,
  ],
})
export class AppModule {}
