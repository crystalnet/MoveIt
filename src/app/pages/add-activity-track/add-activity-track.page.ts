import {Component, OnInit} from '@angular/core';
import {Activity} from '../../model/activity';
import {ActivityService} from '../../services/activity/activity.service';
import {Location} from '@angular/common';
import {LoadingController, ToastController} from '@ionic/angular';
import {NavigationExtras, Router} from '@angular/router';
import {ActionLog} from '../../model/actionLog';
import {TrackingService} from '../../services/tracking/tracking.service';


@Component({
    selector: 'app-add-activity-track',
    templateUrl: './add-activity-track.page.html',
    styleUrls: ['./add-activity-track.page.scss'],
})
export class AddActivityTrackPage implements OnInit {
    activity: Activity;
    minutes: number;
    counter = 0;
    types: Array<string>;
    intensities: Array<string>;
    // percent:number = 0;
    // radius:number = 100;

    // fullTime: any = '00:01:30';
    // timer: any = false;
    // progress: any = false;
    // minutes2:number = 1;
    // seconds: any = 30;
    elapsed: any = {
        h: '00',
        m: '00',
        s: '00'
    };
    elapsedTotalMilliseconds = 0;
    overallTimer: any = false;


    constructor(private loadingController: LoadingController, private activityService: ActivityService, private location: Location,
                private toastController: ToastController, private router: Router, private trackingService: TrackingService) {
        this.activity = new Activity();
        this.location = location;
        this.types = Activity.types;
        this.intensities = Activity.intensities;

    }

    goBack() {
        this.location.back();
    }

    ngOnInit() {
    }

    async presentAlert() {
        await this.toastController.create({
            color: 'dark',
            duration: 2000,
            message: 'Activity added successfully!',
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

    async addActivity() {
        if (this.elapsed.h === '00' && this.elapsed.m === '00' && this.elapsed.s === '00') {
            return;
        }

        const loading = await this.loadingController.create({
            cssClass: 'my-custom-class',
            message: 'Adding activity...',
            duration: 2000
        });
        await loading.present();

        const newDateObj =
            new Date(this.activity.startTime.getTime() + this.elapsed.m * 60000 + this.elapsed.s * 1000 + this.elapsed.h * 3600000);

        this.activity.endTime = new Date(newDateObj);
        this.activity.source = 'moveItApp';
        this.activity.intensity = this.activity.intensity.toLowerCase();
        this.activity.type = this.activity.type.toLowerCase();

        console.log(this.activity);
        this.activityService.createActivity(this.activity).then(
            res => {
                this.trackingService.logAction(new ActionLog('manual-activity-added', res.id));
                console.log(res);
                loading.dismiss();
                this.presentAlert();
                this.router.navigateByUrl('/menu/progress');
            },
            err => {
                loading.dismiss();
                console.log(err);
            }
        );
        this.stopTimer();
    }

    routeToInfoSingle() {
        const navigationExtras: NavigationExtras = {
            queryParams: {
                infoId: 0
            }
        };
        this.router.navigate(['/menu/information'], navigationExtras);
    }

    startTimer() {
        /* if(this.timer){
           clearInterval(this.timer);
         }*/
        if (!this.overallTimer) {
            this.progressTimer();
        }
        /*this.timer = false;
        this.percent = 0;
        this.progress = 0;

        let timeSplit = this.fullTime.split(':');
        this.minutes2 = timeSplit[1];
        this.seconds = timeSplit[2];

        let totalSeconds = Math.floor(this.minutes2 * 60) + parseInt(this.seconds);

        this.timer = setInterval(() => {
         if(this.percent === this.radius){
            clearInterval(this.timer);
          }
         // this.percent = Math.floor((this.progress / totalSeconds) * 100);
          this.progress++;
        }, 1000)*/
    }

    progressTimer() {
        const countDownDate = new Date();
        countDownDate.setMilliseconds(countDownDate.getMilliseconds() - this.elapsedTotalMilliseconds);

        this.overallTimer = setInterval(() => {
            const now = new Date().getTime();
            const distance = now - countDownDate.getTime();

            this.elapsed.h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            this.elapsed.m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            this.elapsed.s = Math.floor((distance % (1000 * 60)) / (1000));

            this.elapsed.h = this.pad(this.elapsed.h, 2);
            this.elapsed.m = this.pad(this.elapsed.m, 2);
            this.elapsed.s = this.pad(this.elapsed.s, 2);

            this.elapsedTotalMilliseconds = distance;

        }, 1000);
    }

    pauseTimer() {
        clearInterval(this.overallTimer);
        this.overallTimer = false;

    }

    startAgain() {
        while (this.counter < 1) {
            this.activity.startTime = new Date();
            this.counter++;
        }
        console.log(this.activity.startTime);
        this.overallTimer = true;
        this.progressTimer();

    }

    pad(num, size) {
        let s = num + '';
        while (s.length < size) {
            s = '0' + s;
        }
        return s;
    }

    stopTimer() {
        // clearInterval(this.timer);
        clearInterval(this.overallTimer);
        this.overallTimer = false;
        // this.timer = false;
        // this.percent = 0;
        // this.progress = 0;
        this.elapsedTotalMilliseconds = 0;
        this.elapsed = {
            h: '00',
            m: '00',
            s: '00'
        };
        this.counter = 0;
    }


}
