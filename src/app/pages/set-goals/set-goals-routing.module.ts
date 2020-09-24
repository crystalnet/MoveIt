import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SetGoalsPage } from './set-goals.page';

const routes: Routes = [
  {
    path: '',
    component: SetGoalsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SetGoalsPageRoutingModule {}
