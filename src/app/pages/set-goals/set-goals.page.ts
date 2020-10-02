import {Component, OnInit} from '@angular/core';
import {Location} from '@angular/common';
import {Router} from '@angular/router';
import {GoalService} from '../../services/goal/goal.service';
import {AlertController} from '@ionic/angular';
import {TrackingService} from '../../services/tracking/tracking.service';
import {combineLatest, Observable} from 'rxjs';

@Component({
    selector: 'app-set-goals',
    templateUrl: './set-goals.page.html',
    styleUrls: ['./set-goals.page.scss'],
})
export class SetGoalsPage implements OnInit {
    goalPromise: Observable<any>;

    constructor(private location: Location, private router: Router, private goalService: GoalService,
                private alertController: AlertController, private trackingService: TrackingService) {
        const dailyActive = this.goalService.getGoal('daily-active');
        const weeklyActive = this.goalService.getGoal('weekly-active');
        this.goalPromise = combineLatest(weeklyActive, dailyActive);
        this.goalPromise.subscribe(res => console.log(res));
    }

    ngOnInit() {
    }

    goBack() {
        this.location.back();
    }

    editGoal(goal) {
        this.goalService.adjustGoal(goal, goal.target).then(
            res => {
                console.log(res);
                this.presentAlert();
                this.router.navigateByUrl('/menu/dashboard');
            },
            err => console.log(err)
        );
    }

    async presentAlert() {
        const alert = await this.alertController.create({
            header: 'You\'re all set!',
            message: 'You\'re goals have been set successfully. You\'re now ready to start using the app',
            buttons: [
                {
                    text: 'Let\'s go', handler: () => {
                        this.trackingService.logReaction('goal-adjustment-initial', '');
                    }
                }
            ],
        });
        await alert.present();
        const result = await alert.onDidDismiss();
        console.log(result);
    }
}
