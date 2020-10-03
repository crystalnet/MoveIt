import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InitialSetupPageRoutingModule } from './initial-setup-routing.module';

import { InitialSetupPage } from './initial-setup.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InitialSetupPageRoutingModule
  ],
  declarations: [InitialSetupPage]
})
export class InitialSetupPageModule {}
