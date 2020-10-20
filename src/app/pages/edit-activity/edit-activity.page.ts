import {Component, OnInit} from '@angular/core';
import {Activity} from '../../model/activity';
import {ActivityService} from '../../services/activity/activity.service';
import {Location} from '@angular/common';

import {Router, NavigationExtras} from '@angular/router';
import {ToastController} from '@ionic/angular';
import * as moment from 'moment-timezone';
import {Moment} from 'moment-timezone';
import {TrackingService} from '../../services/tracking/tracking.service';
import {ActionLog} from '../../model/actionLog';

@Component({
    selector: 'app-edit-activity',
    templateUrl: './edit-activity.page.html',
    styleUrls: ['./edit-activity.page.scss'],
})
export class EditActivityPage implements OnInit {
    activity: Activity;
    minutes: number;
    startDate: string;
    startTime: string;
    type: string;
    intensity: string;
    types: Array<string>;
    intensities: Array<string>;
    today: Moment = moment().tz('Europe/Berlin');
    oldActivity;

    constructor(private activityService: ActivityService, private location: Location, private router: Router,
                private toastController: ToastController, private trackingService: TrackingService) {
        this.activity = this.router.getCurrentNavigation().extras.state.activity; // TODO: display error message if empty
        this.oldActivity = {...this.activity};

        this.type = this.activity.type;
        this.intensity = this.activity.intensity;
        this.startDate = this.activity.startTime.toString();
        this.startTime = this.activity.startTime.toString();
        this.minutes = this.activity.getDuration();

        this.types = Activity.types;
        this.intensities = Activity.intensities;

        this.router = router;
    }

    ngOnInit() {
    }

    goBack() {
        this.location.back();
    }

    async presentAlert() {
        await this.toastController.create({
            color: 'dark',
            duration: 2000,
            message: 'Activity edited successfully!',
            buttons: [
                {
                    text: 'Done',
                    role: 'cancel'
                }
            ]
        }).then(toast => {
            toast.present();
        });
    }


    /**
     * Update an existing id
     *
     * An updated activity object and the id of the activity to be updated must be provided
     */
    editActivity() {
        const t1: any = moment(this.startDate).tz('Europe/Berlin');
        const t2: any = moment(this.startTime).tz('Europe/Berlin');
        t1.set('hours', t2.get('hours')).set('minutes', t2.get('minutes'));

        this.activity.startTime = t1.toDate();
        t1.add(this.minutes, 'minutes');
        this.activity.endTime = t1.toDate();
        this.activity.intensity = this.intensity.toLowerCase();
        this.activity.type = this.type.toLowerCase();

        this.activity.source = 'moveItApp';
        console.log(this.activity);

        this.activityService.editActivity(this.activity.id, this.activity, this.oldActivity).then(
            res => {
                console.log(res);
                this.presentAlert();
                this.trackingService.logAction(new ActionLog('activity-edited', res.id));
                this.router.navigateByUrl('/menu/progress');
            },
            err => console.log(err)
        );
    }

    routeToInfoSingle() {

        const navigationExtras: NavigationExtras = {
            queryParams: {
                infoId: 0
            }
        };
        this.router.navigate(['/menu/information'], navigationExtras);
    }


}
