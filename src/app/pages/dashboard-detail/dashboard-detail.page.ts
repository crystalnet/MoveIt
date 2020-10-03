import {Component, OnInit} from '@angular/core';
import {UserService} from 'src/app/services/user/user.service';
import {Observable} from 'rxjs';

@Component({
    selector: 'app-dashboard-detail',
    templateUrl: './dashboard-detail.page.html',
    styleUrls: ['./dashboard-detail.page.scss'],
})
export class DashboardDetailPage implements OnInit {

    allServices = [];

    social = {
        label: 'Social Feed',
        routerLink: '/menu/socialfeed',
        image: './assets/socialfeed2.png'
    };

    leaderboard = {
        label: 'Leaderboard',
        routerLink: '/menu/leaderboard',
        image: './assets/leaderboard2.png'
    };

    rewards = {
        label: 'Rewards',
        routerLink: '/menu/rewards',
        image: './assets/rewards2.png'
    };

    information = {
        label: 'Information',
        routerLink: '/menu/information',
        image: './assets/information.png'
    };

    group: Observable<string>;
    config: Observable<string>;
    selectedPath = '';
    leaderboardB = false;
    socialB = false;
    rewardsB = false;

    constructor(private userService: UserService) {
        this.group = userService.getUsergroup();
        this.group.subscribe(group => this.updateGroup(group));
    }

    ngOnInit() {
    }

    /**
     * Update the group of the user
     *
     * This method updates the whole pages array when there is a new group available. This is necessary, because
     * Angular cannot detect changes in the elements of the array.
     *
     * @param group the new group
     */
    updateGroup(group) {
        // BK: as a test I delted for group 1 the rewards page
        this.config = this.userService.getGroupconfig(group);
        this.config.subscribe(config => this.setPages(config));

    }

    setPages(config) {
        const array = JSON.parse(config);
        this.allServices = [];
        for (const i of array) {
            switch (i) {
                case 'Leaderboard': {
                    this.allServices.push(this.leaderboard);
                    this.leaderboardB = true;
                    break;
                }
                case 'Social': {
                    this.allServices.push(this.social);
                    this.socialB = true;
                    break;
                }
                case 'Rewards': {
                    this.allServices.push(this.rewards);
                    this.rewardsB = true;
                    break;
                }
                default: {
                    break;
                }
            }
        }
        this.allServices.push(this.information); // Information is visible for all users and therefore always added
    }

}
