import {Component, OnInit} from '@angular/core';
import {GoalService} from '../../services/goal/goal.service';
import {Location} from '@angular/common';

import {Router} from '@angular/router';
import {AlertController} from '@ionic/angular';
import {TrackingService} from '../../services/tracking/tracking.service';
import {combineLatest, Observable} from 'rxjs';
import {User} from '../../model/user';
import {Goal} from '../../model/goal';

@Component({
    selector: 'app-goals-detail',
    templateUrl: './goals-detail.page.html',
    styleUrls: ['./goals-detail.page.scss'],
})
export class GoalsDetailPage implements OnInit {
    speed = 0;
    max = 500;

    goalPromise: Observable<any>;
    userObservable: Observable<User>;
    user: User;
    dailyActive: Goal;
    weeklyActive: Goal;

    constructor(private goalService: GoalService, private location: Location, private router: Router,
                private alertController: AlertController, private trackingService: TrackingService) {
        // this.goal = this.router.getCurrentNavigation().extras.state.goal; // TODO: display error message if empty

        // this.goals = this.goalService.getGoals();
        this.router = router;

        // if (this.goal.duration === 'daily') {
        //     this.max = 120;
        // }

        const dailyActive = this.goalService.getGoal('daily-active');
        const weeklyActive = this.goalService.getGoal('weekly-active');
        this.goalPromise = combineLatest([dailyActive, weeklyActive]);
        this.goalPromise.subscribe(res => {
            this.dailyActive = res[0];
            this.weeklyActive = res[1];
        });
    }

    save() {
        const promises = [];

        promises.push(this.goalService.adjustGoal(this.dailyActive, this.dailyActive.target));
        promises.push(this.goalService.adjustGoal(this.weeklyActive, this.weeklyActive.target));

        Promise.all(promises).then(
            res => {
                console.log(res);
                this.presentAlert();
                this.router.navigateByUrl('/menu/dashboard');
            },
            err => console.log(err)
        );
    }

    ngOnInit() {
        console.log(this.router.getCurrentNavigation().extras.state);
    }

    goBack() {
        this.location.back();
    }

    async presentAlert() {
        const alert = await this.alertController.create({
            header: 'Success',
            message: 'Were the previous goal too easy?',
            buttons: [
                {
                    text: 'YES', handler: () => {
                        this.trackingService.logReaction('goal-adjustment-too-easy', 'yes');
                    }
                },
                {
                    text: 'No', handler: () => {
                        this.trackingService.logReaction('goal-adjustment-too-easy', 'yes');
                    }
                }
            ],
        });

        await alert.present();
        const result = await alert.onDidDismiss();
        console.log(result);
    }
}
