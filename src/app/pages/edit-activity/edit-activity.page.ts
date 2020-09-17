import {Component, OnInit} from '@angular/core';
import {Activity} from '../../model/activity';
import {ActivityService} from '../../services/activity/activity.service';
import {Location} from '@angular/common';

import {Router, NavigationExtras} from '@angular/router';
import {ToastController} from '@ionic/angular';

// import { ConsoleReporter } from 'jasmine';


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
    types: Array<string>;
    intensities: Array<string>;
    todayA: Date = new Date();
    today: string = new Date().toISOString();

    constructor(private activityService: ActivityService, private location: Location, private router: Router,
                private toastController: ToastController) {
        this.activity = this.router.getCurrentNavigation().extras.state.activity; // TODO: display error message if empty

        this.startDate = this.activity.startTime.toString();
        this.startTime = this.activity.startTime.toString();

        this.minutes = this.activity.getDuration();

        this.location = location;
        this.types = Activity.types;
        this.intensities = Activity.intensities;

        this.router = router;
    }

    ngOnInit() {
        console.log('On Init');
        console.log(this.router.getCurrentNavigation().extras.state);
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

    convertDate() {

        const t1: any = this.activity.startDateIso.split('T');
        const t2: any = this.activity.startTimeIso.split('T');
        const t3: any = t1[0].concat('T', t2);
        const timezoneOffsetMin = new Date().getTimezoneOffset();
        console.log(timezoneOffsetMin);

        this.activity.startTime = new Date((new Date(t3).getTime()) - timezoneOffsetMin * 60000);
    }

    /**
     * Update an existing id
     *
     * An updated activity object and the id of the activity to be updated must be provided
     */
    editActivity() {
        console.log(this.startDate);
        console.log(this.startTime);
        const t1: any = new Date(this.startDate);
        const t2: any = new Date(this.startTime);
        t1.setHours(t2.getHours());
        t1.setMinutes(t2.getMinutes());
        this.activity.startTime = t1;
        console.log(t1);

        const newDateObj = new Date(this.activity.startTime.getTime() + this.minutes * 60000);
        this.activity.endTime = new Date(newDateObj);

        if ((new Date().getTime() - this.activity.endTime.getTime()) <= 0) {
            return;
        }

        // this.activity.source = 'moveItApp';

        console.log(this.activity);
        this.activityService.editActivity(this.activity.id, this.activity).then(
            res => {
                console.log(res);
                this.presentAlert();
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
