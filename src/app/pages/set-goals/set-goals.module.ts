import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SetGoalsPageRoutingModule } from './set-goals-routing.module';

import { SetGoalsPage } from './set-goals.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SetGoalsPageRoutingModule
  ],
  declarations: [SetGoalsPage]
})
export class SetGoalsPageModule {}
