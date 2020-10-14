interface FireBaseObject {
    id: string;
    distance: object;
    endTime: Date;
    intensity: string;
    startTime: Date;
    type: string;
    source: string;
}

interface ApiObject {
    calories: number;
    distance: number;
    startDate: Date;
    sourceBundleId: string;
    endDate: Date;
    unit: string;
    value: string;
    source: string;
}

interface Distance {
    unit: string;
    value: number;
}

export class Activity {

    /**
     * Constructor to create Activity
     *
     * Each parameter is optional. If it's not present, a default value is used
     *
     */
    constructor(id?: string, distance?: Distance, endTime?: Date, intensity?: string, startTime?: Date, type?: string, source?: string) {
        // Each parameter is optional, if it's not there, set the default value
        this.id = id || '';
        this.distance = distance || {unit: 'km', value: 0};
        this.endTime = endTime || new Date(2019, 0O5, 0O5, 17, 23, 42, 0);
        this.intensity = intensity || 'moderate';
        this.startTime = startTime || new Date(2019, 0O5, 0O5, 17, 55, 42, 0);
        this.type = type || 'running';
        this.source = source || 'unknown';
    }

    static types = ['basketball', 'biking', 'climbing', 'dancing', 'handball', 'hiking', 'football', 'running', 'swimming', 'volleyball', 'walking', 'weight training', 'yoga', 'other'];
    static intensities = ['moderate', 'vigorous'];
    startDateIso: string;
    startTimeIso: string;
    minutes: number;
    id: string;
    distance: Distance;
    endTime: Date;
    intensity: string;
    startTime: Date;
    type: string;
    source: string;

    /**
     * Creates an Activity object from a firebase query
     *
     * This basically reconstructs the dates from the date strings
     *
     * @param id id of the activity
     * @param activity an activity
     */
    static fromFirebaseObject(id: string, activity: Activity) {// firebaseObject: FireBaseObject) {
        return new Activity(
            id,
            activity.distance,
            new Date(activity.endTime) || new Date(),
            activity.intensity || '',
            new Date(activity.startTime) || new Date(), // new Date(firebaseObject.startTime) || new Date(),
            activity.type || '',
            activity.source || 'unknown'
        );
    }

    /**
     * Creates an Activity object from an Fitnes API Object
     *
     * This basically reconstructs the dates from the date strings
     *
     * @param ApiObj object from Fitness API
     */

    static fromFitApi(ApiObj: Array<ApiObject>) {
        const ActMulit = [];
        let ActSingle: Activity;
        ApiObj.forEach((SingleEntry) => {
            console.log('Single Entry of Fitness API: ', SingleEntry);
            // still activity will be excluded
            // activities that are not defined by API will be excluded
            const dropActivities = ['other', 'in_vehicle', 'still', 'unknown', 'sleep', 'sleep_awake', 'sleep_deep', 'sleep_light', 'sleep-rem'];
            if (dropActivities.includes(SingleEntry.value.toLowerCase())) {
                return;
            }

            // activities shorter then 10 minutes will be disregarded
            const duration = Math.round((SingleEntry.endDate.getTime() - SingleEntry.startDate.getTime()) / 60000);
            if (duration < 10 || duration > 300) {
                return;
            }

            /*
            if (['basketball', 'biking', 'dancing','handball','football','running', 'swimming', 'volleyball', 'walking']
                 .indexOf(SingleEntry.value) === -1){
                SingleEntry.value = 'other'
            };  */

            ActSingle = new Activity();
            ActSingle.distance = {unit: 'm', value: SingleEntry.distance};
            ActSingle.endTime = SingleEntry.endDate;
            ActSingle.startTime = SingleEntry.startDate;
            ActSingle.type = SingleEntry.value.toLowerCase();
            ActSingle.source = SingleEntry.sourceBundleId;
            ActSingle.intensity = 'vigorous';

            const moderateActivities = ['biking', 'gardening', 'golf', 'hiking', 'housework', 'meditation', 'on_bicycle', 'on_foot', 'stair_climbing', 'tilting', 'walking', 'walking_stroller', 'walking_treadmill'];
            if (moderateActivities.includes(ActSingle.type)) {
                ActSingle.intensity = 'moderate';
            }

            ActMulit.push(ActSingle);
        });
        return ActMulit;
    }

    /**
     * Converts the activity to upload it to firebase
     *
     * Basically just replaces the dates with date strings
     */
    toFirebaseObject() {
        return {
            distance: this.distance,
            endTime: this.endTime.getTime(),
            intensity: this.intensity,
            startTime: this.startTime.getTime(),
            type: this.type,
            source: this.source,
        };
    }

    /**
     * Converts the activity to upload it to Fitness API
     */
    toFitApi() {
        return {
            calories: 0,
            distance: this.distance.value,
            endDate: this.endTime,
            sourceBundleId: 'com.moveitproject.www',
            startDate: this.startTime,
            unit: 'activityType',
            value: this.type,
            source: this.source,
        };
    }

    /**
     * Returns the duration of the activity in minutes
     */
    getDuration() {
        return Math.round((this.endTime.getTime() - this.startTime.getTime()) / 60000);
    }
}
