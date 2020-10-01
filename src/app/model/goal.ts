interface FirebaseObject {
    current: number;
    duration: string;
    history: Array<object>;
    target: number;
    type: string;
    relative: number;
}

export class Goal {

    /**
     * Constructor to create Goal
     *
     * Each parameter is optional. If it's not present, a default value is used
     *
     */


    constructor(name?: string, duration?: string, type?: string, target?: number, current?: number, history?: Array<object>) {
        // Each parameter is optional, if it's not there, set the default value
        this.name = name || '';
        this.current = current || 0;
        this.duration = duration || 'daily';
        this.history = history || [];
        this.target = target || 0;
        this.type = type || 'vigorous';
        this.relative = (current / target) || 0;
    }

    static durations = ['daily', 'weekly'];
    static types = ['moderate', 'vigorous', 'active'];
    static intensities = ['moderate', 'vigorous'];
    static defaultGoals: Array<Goal> = [
        new Goal('daily-moderate', 'daily', 'moderate', 20, 0),
        new Goal('weekly-moderate', 'weekly', 'moderate', 150, 0),
        new Goal('daily-vigorous', 'daily', 'vigorous', 10, 0),
        new Goal('weekly-vigorous', 'weekly', 'vigorous', 75, 0),
        new Goal('daily-active', 'daily', 'active', 20, 0),
        new Goal('weekly-active', 'weekly', 'active', 150, 0),
    ];
    name: string;
    current: number;
    duration: string;
    history: Array<object>;
    target: number;
    type: string;
    relative: number;

    /**
     * Reconstruct the Goal from a firebase result
     *
     * Just append the name to the new object since it's used as a key in the firebase database
     *
     * @param name of the new goal
     * @param firebaseObject result of the firebase query
     */
    static fromFirebaseObject(name, firebaseObject: FirebaseObject) {
        const goalType = name.split('-');
        const duration = goalType[0];
        const type = goalType[1];

        return new Goal(name, duration, type, firebaseObject.target, firebaseObject.current, firebaseObject.history);

    }

    static fromAnyObject(name, firebaseObject: any) {
        const goalType = name.split('-');
        const duration = goalType[0];
        const type = goalType[1];

        return new Goal(name, duration, type, firebaseObject.target, firebaseObject.current, firebaseObject.history);
    }

    /**
     * Prepare for upload to firebase
     *
     * Remove the name as it's used as a key
     *
     */
    toFirebaseObject() {
        const copy = {...this};
        delete copy.name;
        delete copy.type;
        delete copy.duration;
        return copy;
    }
}
