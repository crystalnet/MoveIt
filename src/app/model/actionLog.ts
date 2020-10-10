interface FirebaseObject {
    action: string;
    object: string;
    oldValue: number;
    newValue: number;
    timestamp: number;
}

export class ActionLog {

    /**
     * Constructor to create ActionLog
     *
     * Each parameter is optional. If it's not present, a default value is used
     *
     */
    constructor(action?: string, object?: string, oldValue?: any, newValue?: any, time?: Date) {
        // Each parameter is optional, if it's not there, set the default value
        this.action = action || '';
        this.object = object || '';
        this.oldValue = oldValue || 0;
        this.newValue = newValue || 0;
        this.timestamp = time || new Date();
    }

    static actions = ['adjust-goal'];
    action: string;
    object: string;
    oldValue: any;
    newValue: any;
    timestamp: Date;

    /**
     * Reconstruct the ActionLog from a firebase result
     *
     * Just convert the date back to a Date object
     *
     * @param firebaseObject result of the firebase query
     */
    static fromFirebaseObject(firebaseObject: FirebaseObject) {
        return new ActionLog(
            firebaseObject.action,
            firebaseObject.object,
            firebaseObject.oldValue,
            firebaseObject.newValue,
            new Date(firebaseObject.timestamp));
    }

    /**
     * Prepare for upload to firebase
     *
     * Convert the Dates to numbers
     *
     */
    toFirebaseObject() {
        return {
            action: this.action,
            object: this.object,
            oldValue: this.oldValue,
            newValue: this.newValue,
            timestamp: this.timestamp.getTime()
        };
    }
}
