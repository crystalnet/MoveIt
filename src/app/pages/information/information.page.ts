import {Component, OnDestroy, OnInit} from '@angular/core';
import {TrackingService} from '../../services/tracking/tracking.service';

@Component({
    selector: 'app-information',
    templateUrl: './information.page.html',
    styleUrls: ['./information.page.scss'],
})
export class InformationPage implements OnInit, OnDestroy {

    constructor(private trackingService: TrackingService) {
    }

    ngOnInit() {
        this.trackingService.startRecordingViewTime('information');
    }

    ngOnDestroy() {
        this.trackingService.stopRecordingViewTime('information');
    }

}
