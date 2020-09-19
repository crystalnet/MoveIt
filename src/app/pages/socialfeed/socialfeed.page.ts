import {Component, OnDestroy, OnInit} from '@angular/core';
import {TrackingService} from '../../services/tracking/tracking.service';

@Component({
    selector: 'app-socialfeed',
    templateUrl: './socialfeed.page.html',
    styleUrls: ['./socialfeed.page.scss'],
})
export class SocialfeedPage implements OnInit, OnDestroy {

    constructor(private trackingService: TrackingService) {
    }

    ngOnInit() {
        this.trackingService.startRecordingViewTime('socialfeed');
    }

    ngOnDestroy() {
        this.trackingService.stopRecordingViewTime('socialfeed');
    }

}
