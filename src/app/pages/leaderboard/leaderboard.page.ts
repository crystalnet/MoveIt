import {Component, OnDestroy, OnInit} from '@angular/core';
import {TrackingService} from '../../services/tracking/tracking.service';

@Component({
    selector: 'app-leaderboard',
    templateUrl: './leaderboard.page.html',
    styleUrls: ['./leaderboard.page.scss'],
})
export class LeaderboardPage implements OnInit, OnDestroy {

    constructor(private trackingService: TrackingService) {
    }

    ngOnInit() {
        this.trackingService.startRecordingViewTime('leaderboard');
    }

    ngOnDestroy() {
        this.trackingService.stopRecordingViewTime('leaderboard');
    }

}
