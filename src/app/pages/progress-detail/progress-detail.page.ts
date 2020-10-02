import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivityService} from '../../services/activity/activity.service';
import {Activity} from '../../model/activity';
import {combineLatest, merge, Observable} from 'rxjs';
import {GoalService} from '../../services/goal/goal.service';
import {Goal} from '../../model/goal';
import {Location} from '@angular/common';
import {Health} from '@ionic-native/health/ngx';
import {IonSlides, NavController, Platform} from '@ionic/angular';
import {Router} from '@angular/router';
import {Chart} from 'chart.js';
import {map} from 'rxjs/operators';
import * as moment from 'moment';

@Component({
    selector: 'app-progress-detail',
    templateUrl: './progress-detail.page.html',
    styleUrls: ['./progress-detail.page.scss'],


})
export class ProgressDetailPage implements OnInit {
    dailyActivePromise: Promise<any>;
    dailyActive: Goal;
    weeklyActivePromise: Promise<any>;
    weeklyActive: Goal;

    currentGoals: any;
    goalHistory: any;

    nActivities = 0;

    activities: Observable<Activity[]>;
    // Array which contains the displayed activities
    displayedActivities: Observable<Activity[]>;
    duration = 'day';

    activitiesChartData;
    public chartLabelsProgress: any = [];
    public chartValuesModerate: any = [];
    public chartValuesVigorous: any = [];
    public chartValuesWeight: any = [];
    public chartColours: any = [];
    public chartHoverColours: any = [];


    @ViewChild('slides', {static: false}) slides: IonSlides;
    @ViewChild('barChart', {static: false}) barChart: { nativeElement: any; };
    @ViewChild('hrzBarChart5', {static: false}) hrzBarChart5: { nativeElement: any; };
    @ViewChild('weeklyChart', {static: false}) weeklyChart: { nativeElement: any; };

    // barChart: any;

    hrzBars5: any;
    weeklyBarChart: any;
    progressChartData: any;
    public chartLabelsActivities: any = [];

    slideOpts = {
        initialSlide: 4
    };
    wonGoals: any;
    wonGoalsName: any;
    allInfo: any[] = [];
    goalsHistory: Array<Goal>;
    lastGoalM = 0;
    lastGoalV = 0;
    lastGoalW = 0;
    activitiesGoals: Array<Activity>;
    relative: number;
    wholeDuration: any[];
    relativeV: number;
    relativeW: number;

    oldGoals: any[] = [];

    constructor(private activityService: ActivityService, private goalService: GoalService, private location: Location,
                private health: Health, private platform: Platform, private router: Router, private navCtrl: NavController) {
        const history = this.goalService.getGoalHistory();
        const current = this.goalService.getGoals();
        combineLatest(history, current).subscribe((results) => {
            console.log('ENTERED');
            this.goalHistory = results[0];
            this.currentGoals = results[1];
            this.prepareProgressChartData();
        });

        this.loadMoreActivities();

        this.dailyActivePromise = this.goalService.getGoal('daily-active').then(res => this.dailyActive = res, err => console.log(err));
        this.weeklyActivePromise = this.goalService.getGoal('weekly-active').then(res => this.weeklyActive = res, err => console.log(err));

        // this.prepareProgressChartData();
        // this.defineChartData();
        // this.loadOldGoals();
    }

    ionViewDidEnter() {
    }

    loadMoreActivities(event?) {
        this.nActivities += 5;
        this.displayedActivities = this.activityService.getAllUserActivities(this.nActivities);
        if (event) {
            event.target.complete();
        }
    }

    prepareProgressChartData() {
        const that = this;

        this.chartLabelsProgress = [];
        const weeklyProgress = [];
        const intensities = Goal.intensities; // ['moderate','vigorous']
        const duration = Goal.durations[1]; // 'weekly'
        const start = moment().startOf('week').endOf('day').add(1, 'day');
        const current = start.clone();
        const today = (moment().get('day') + 7 - 1) % 7;

        // Prepare weekly activities with days -6 days until today as indices and initialize with empty array
        for (const intensity of intensities) {
            current.set(start.toObject());
            weeklyProgress[intensity] = new Array(7);
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                let value = 0;
                const history = this.goalHistory[`${duration}-${intensity}`];
                if (dayOfWeek > today) {
                    value = null;
                } else if (dayOfWeek === today) {
                    value = this.currentGoals.filter(el => el.name === `${duration}-${intensity}`)[0].relative;
                } else if (history && history.hasOwnProperty(current.valueOf())) {
                    value = history[current.valueOf()].relative;
                }
                weeklyProgress[intensity][dayOfWeek] = value;
                if (that.chartLabelsProgress.length < 7) {
                    that.chartLabelsProgress.push(current.format('ddd'));
                }
                current.add(1, 'day');
            }
        }
        this.progressChartData = weeklyProgress;
        console.log(weeklyProgress);
        console.log(that.chartLabelsProgress);

        that.createProgressChart();
    }

    // weekly
    prepareActivitiesChartData() {
        const that = this;

        this.chartLabelsActivities = [];
        const weeklyActivities = [];
        const intensities = Goal.intensities; // ['moderate','vigorous']
        const duration = Goal.durations[0]; // 'daily'
        const start = moment().endOf('day').subtract(6, 'day');
        const current = start.clone();

        // Prepare weekly activities with days -6 days until today as indices and initialize with empty array
        for (const intensity of intensities) {
            current.set(start.toObject());
            weeklyActivities[intensity] = new Array(7);
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                let value = 0;
                const history = this.goalHistory[`${duration}-${intensity}`];
                if (history && history.hasOwnProperty(current.valueOf())) {
                    value = history[current.valueOf()].current;
                }
                weeklyActivities[intensity][dayOfWeek] = value;
                if (that.chartLabelsActivities.length < 7) {
                    that.chartLabelsActivities.push(current.format('ddd'));
                }
                current.add(1, 'day');
            }
            console.log(this.currentGoals);
            weeklyActivities[intensity][6] = this.currentGoals.filter(el => el.name === `${duration}-${intensity}`)[0].current;
        }
        this.activitiesChartData = weeklyActivities;
        console.log(weeklyActivities);
        console.log(that.chartLabelsActivities);

        that.createActivitiesChart();
    }


    createProgressChart() {
        if (this.hrzBars5) {
            this.hrzBars5.destroy();
        }

        const ctx = this.hrzBarChart5.nativeElement;
        // ctx.height = 400;

        this.hrzBars5 = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.chartLabelsProgress,
                datasets: [
                    {
                        label: 'moderate',
                        data: this.progressChartData.moderate,
                        backgroundColor: '#F61067', // array should have same number of elements as number of dataset
                        borderColor: '#F61067', // array should have same number of elements as number of dataset
                        borderWidth: 1
                    },
                    {
                        label: 'vigorous',
                        data: this.progressChartData.via,
                        backgroundColor: '#6DECAF', // array should have same number of elements as number of dataset
                        borderColor: '#6DECAF', // array should have same number of elements as number of dataset
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Hour'
                        },
                        /*type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'DD'
                            }
                        },*/
                        barPercentage: 0.9,
                        gridLines: {
                            display: false
                        },
                        stacked: true
                    }],
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Minutes'
                        },
                        ticks: {
                            beginAtZero: true,
                            suggestedMin: 0,
                            suggestedMax: 1
                        },
                        stacked: true
                    }]
                }
            }
        });
    }


    createActivitiesChart() {
        if (this.weeklyBarChart) {
            this.weeklyBarChart.destroy();
        }

        const ctx = this.weeklyChart.nativeElement;
        // ctx.height = 400;

        this.weeklyBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.chartLabelsActivities,
                datasets: [
                    {
                        label: 'moderate',
                        data: this.activitiesChartData.moderate,
                        backgroundColor: '#F61067', // array should have same number of elements as number of dataset
                        borderColor: '#F61067', // array should have same number of elements as number of dataset
                        borderWidth: 1
                    },
                    {
                        label: 'vigorous',
                        data: this.activitiesChartData.vigorous,
                        backgroundColor: '#6DECAF', // array should have same number of elements as number of dataset
                        borderColor: '#6DECAF', // array should have same number of elements as number of dataset
                        borderWidth: 1
                    }
                ]
            },
            options: {
                scales: {
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Day'
                        },
                        /*type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'DD'
                            }
                        },*/
                        barPercentage: 0.9,
                        gridLines: {
                            display: false
                        },
                        stacked: true
                    }],
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Minutes'
                        },
                        ticks: {
                            beginAtZero: true
                        },
                        stacked: true
                    }]
                }
            }
        });
    }

    ngOnInit() {
        // this.checkPlatformReady();
    }

    goBack() {
        this.location.back();
    }

    routeToEditGoalPage(goal: Goal) {
        this.router.navigateByUrl('/menu/goals/goals/detail', {state: {goal}});
    }

    routeToEditPage(activity: Activity) {
        this.router.navigateByUrl('/menu/progress/progress/edit', {state: {activity}});
    }

    goToOldGoalsPage() {
        this.navCtrl.navigateForward('/menu/progress/progress/goals-old');
    }

    slidePrev() {
        this.slides.slidePrev();
    }

    slideNext() {
        this.slides.slideNext();
    }
}

