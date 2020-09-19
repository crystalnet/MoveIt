import {Component} from '@angular/core';
import {TrackingService} from '../../services/tracking/tracking.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.page.html',
    styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage {

    constructor(private trackingService: TrackingService) {
    }

    ionViewDidEnter() {
        this.trackingService.startRecordingViewTime('dashboard');
        console.log('VIEW LOADED');
    }

    ionViewDidLeave() {
        this.trackingService.stopRecordingViewTime('dashboard');
        console.log('VIEW LEFT');
    }
}
