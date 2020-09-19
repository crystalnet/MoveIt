import {Component, OnDestroy, OnInit} from '@angular/core';
import {TrackingService} from '../../services/tracking/tracking.service';

@Component({
    selector: 'app-add-activity',
    templateUrl: './add-activity.page.html',
    styleUrls: ['./add-activity.page.scss'],
})
export class AddActivityPage implements OnInit, OnDestroy {

    constructor(private trackingService: TrackingService) {
    }

    ngOnInit() {
        this.trackingService.startRecordingViewTime('add-activity');
    }

    ngOnDestroy() {
        this.trackingService.stopRecordingViewTime('add-activity');
    }

}
