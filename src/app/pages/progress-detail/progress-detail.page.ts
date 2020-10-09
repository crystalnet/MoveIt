import {Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {ActivityService} from '../../services/activity/activity.service';
import {Activity} from '../../model/activity';
import {combineLatest, Observable} from 'rxjs';
import {GoalService} from '../../services/goal/goal.service';
import {Goal} from '../../model/goal';
import {Location} from '@angular/common';
import {Health} from '@ionic-native/health/ngx';
import {IonSlides, NavController, Platform} from '@ionic/angular';
import {Router} from '@angular/router';
import {Chart} from 'chart.js';
import * as moment from 'moment';

@Component({
    selector: 'app-progress-detail',
    templateUrl: './progress-detail.page.html',
    styleUrls: ['./progress-detail.page.scss'],


})
export class ProgressDetailPage implements OnInit {
    goalObservable: Observable<any>;
    dailyActive: Goal;
    weeklyActive: Goal;

    currentGoals: any;
    goalHistory: any;

    nActivities = 0;
    slide = 0;

    activities: Observable<Activity[]>;
    // Array which contains the displayed activities
    displayedActivities: Observable<Activity[]>;
    duration = 'day';


    @ViewChild('slides', {static: false}) slides: IonSlides;
    @ViewChild('barChart', {static: false}) barChart: QueryList<ElementRef>;
    @ViewChildren('progressChart') progressChartElement: QueryList<ElementRef>;
    @ViewChildren('activitiesChart') activitiesChartElement: QueryList<ElementRef>;

    progressChart = new Array(4);
    activitiesChart = new Array(4);
    progressChartData = new Array(4);
    activitiesChartData = new Array(4);
    public chartLabelsProgress = new Array(4);
    public chartLabelsActivities = new Array(4);

    slideOpts = {
        initialSlide: 4,
        scrollbar: true,
        pager: true
    };

    constructor(private activityService: ActivityService, private goalService: GoalService, private location: Location,
                private health: Health, private platform: Platform, private router: Router, private navCtrl: NavController) {
        const history = this.goalService.getGoalHistory();
        this.goalObservable = this.goalService.getGoals();
        combineLatest([history, this.goalObservable]).subscribe((results) => {
            console.log('ENTERED');
            this.goalHistory = results[0];
            this.currentGoals = results[1];

            this.updateProgress();
            this.updateActivities();
        });

        this.loadMoreActivities();

        this.goalObservable.subscribe(goals => {
            for (const goal of goals) {
                if (goal.name === 'weekly-active') {
                    this.weeklyActive = goal;
                }
                if (goal.name === 'daily-active') {
                    this.dailyActive = goal;
                }
            }
        });
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

    updateProgress() {
        this.progressChartElement.forEach((ref, index) => {
            index = 3 - index;
            this.prepareProgressChartData(index);
            this.createProgressChart(index, ref);
        });
    }

    updateActivities() {
        this.activitiesChartElement.forEach((ref, index) => {
            index = 3 - index;
            this.prepareActivitiesChartData(index);
            this.createActivitiesChart(index, ref);
        });
    }

    prepareProgressChartData(index) {
        const that = this;
        const n = index;

        this.chartLabelsProgress[n] = [];
        const weeklyProgress = [];
        const intensities = ['active'];
        const duration = Goal.durations[1]; // 'weekly'
        const start = moment().startOf('week').endOf('day').add(1, 'day');
        start.subtract(n * 7, 'day');
        const current = start.clone();
        const today = (moment().get('day') + 7 - 1) % 7;

        // Prepare weekly activities with days -6 days until today as indices and initialize with empty array
        for (const intensity of intensities) {
            current.set(start.toObject());
            weeklyProgress[intensity] = new Array(7);
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                let value = 0;
                if (n === 0 && dayOfWeek > today) {
                    value = null;
                } else if (n === 0 && dayOfWeek === today) {
                    value = this.currentGoals.filter(el => el.name === `${duration}-${intensity}`)[0].relative;
                } else if (this.goalHistory.hasOwnProperty(current.valueOf())) {
                    value = this.goalHistory[current.valueOf()][`${duration}-${intensity}`].relative;
                }
                weeklyProgress[intensity][dayOfWeek] = value;
                if (that.chartLabelsProgress[n].length < 7) {
                    that.chartLabelsProgress[n].push(current.format('ddd'));
                }
                current.add(1, 'day');
            }
        }
        that.progressChartData[n] = weeklyProgress;
        console.log(weeklyProgress);
    }

    // weekly
    prepareActivitiesChartData(index) {
        const that = this;
        const n = index;

        this.chartLabelsActivities[n] = [];
        const weeklyActivities = [];
        const intensities = Goal.intensities; // ['moderate','vigorous']
        const duration = Goal.durations[0]; // 'daily'
        const start = moment().startOf('week').endOf('day').add(1, 'day');
        start.subtract(n * 7, 'day');
        const current = start.clone();
        const today = (moment().get('day') + 7 - 1) % 7;

        // Prepare weekly activities with days -6 days until today as indices and initialize with empty array
        current.set(start.toObject());
        for (const intensity of intensities) {
            weeklyActivities[intensity] = new Array(7);
        }
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            if (this.goalHistory.hasOwnProperty(current.valueOf())) {
                for (const intensity of intensities) {
                    let value = 0;
                    if (n === 0 && dayOfWeek > today) {
                        value = null;
                    } else if (n === 0 && dayOfWeek === today) {
                        value = this.currentGoals.filter(el => el.name === `${duration}-${intensity}`)[0].current;
                    } else if (this.goalHistory.hasOwnProperty(current.valueOf())) {
                        value = this.goalHistory[current.valueOf()][`${duration}-${intensity}`].current;
                    }
                    weeklyActivities[intensity][dayOfWeek] = value;
                }
            }
            if (that.chartLabelsActivities[n].length < 7) {
                that.chartLabelsActivities[n].push(current.format('ddd'));
            }
            current.add(1, 'day');
        }
        that.activitiesChartData[n] = weeklyActivities;
        console.log(weeklyActivities);
    }


    createProgressChart(n, elementRef) {
        if (this.progressChart[n]) {
            this.progressChart[n].destroy();
        }

        const ctx = elementRef.nativeElement;

        this.progressChart[n] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.chartLabelsProgress[n],
                datasets: [
                    {
                        label: 'Weekly goal',
                        data: this.progressChartData[n].active,
                        backgroundColor: '#F61067', // array should have same number of elements as number of dataset
                        borderColor: '#F61067', // array should have same number of elements as number of dataset
                        borderWidth: 1
                    },
                    // {
                    //     label: 'vigorous',
                    //     data: this.progressChartData.via,
                    //     backgroundColor: '#6DECAF', // array should have same number of elements as number of dataset
                    //     borderColor: '#6DECAF', // array should have same number of elements as number of dataset
                    //     borderWidth: 1
                    // }
                ]
            },
            options: {
                responsive: true,
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
                            labelString: 'Percent'
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


    createActivitiesChart(n, elementRef) {
        if (this.activitiesChart[n]) {
            this.activitiesChart[n].destroy();
        }

        const ctx = elementRef.nativeElement;
        this.activitiesChart[n] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.chartLabelsActivities[n],
                datasets: [
                    {
                        label: 'moderate',
                        data: this.activitiesChartData[n].moderate,
                        backgroundColor: '#F61067', // array should have same number of elements as number of dataset
                        borderColor: '#F61067', // array should have same number of elements as number of dataset
                        borderWidth: 1
                    },
                    {
                        label: 'vigorous',
                        data: this.activitiesChartData[n].vigorous,
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

