import {Component, OnInit} from '@angular/core';
import {Location} from '@angular/common';
import {Router} from '@angular/router';
import {GoalService} from '../../services/goal/goal.service';
import {Goal} from '../../model/goal';
import {AlertController} from '@ionic/angular';
import {TrackingService} from '../../services/tracking/tracking.service';

@Component({
    selector: 'app-set-goals',
    templateUrl: './set-goals.page.html',
    styleUrls: ['./set-goals.page.scss'],
})
export class SetGoalsPage implements OnInit {
    goal: Goal;
    goalPromise: Promise<any>;

    constructor(private location: Location, private router: Router, private goalService: GoalService,
                private alertController: AlertController, private trackingService: TrackingService) {
        this.goalPromise = this.goalService.getGoal('weeklyModerate').then(goal => this.goal = goal);
    }

    ngOnInit() {
    }

    goBack() {
        this.location.back();
    }

    editGoal() {
        this.goalService.adjustGoal(this.goal, this.goal.target).then(
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
