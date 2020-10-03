import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InitialSetupPage } from './initial-setup.page';

const routes: Routes = [
  {
    path: '',
    component: InitialSetupPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InitialSetupPageRoutingModule {}
