interface FirebaseObject {
    type: string;
    notificationId: string;
    notificationType: string;
    time: number;
    response: string;
}

export class Reaction {

    /**
     * Constructor to create Reaction
     *
     * Each parameter is optional. If it's not present, a default value is used
     *
     */
    constructor(type?: string, notificationType?: string, response?: string, notificationId?: string, time?: Date) {
        // Each parameter is optional, if it's not there, set the default value
        this.type = type || '';
        this.notificationId = notificationId || '';
        this.notificationType = notificationType || '';
        this.time = time || new Date();
        this.response = response || '';
    }

    static actions = ['adjust-goal'];
    type: string;
    notificationId: string;
    notificationType: string;
    time: Date;
    response: string;

    /**
     * Reconstruct the Reaction from a firebase result
     *
     * Just convert the date back to a Date object
     *
     * @param firebaseObject result of the firebase query
     */
    static fromFirebaseObject(firebaseObject: FirebaseObject) {
        return new Reaction(
            firebaseObject.type,
            firebaseObject.notificationId,
            firebaseObject.notificationType,
            firebaseObject.response,
            new Date(firebaseObject.time)
        );
    }

    /**
     * Prepare for upload to firebase
     *
     * Convert the Dates to numbers
     *
     */
    toFirebaseObject() {
        return {
            type: this.type,
            notificationId: this.notificationId,
            notificationType: this.notificationType,
            time: this.time.getTime(),
            response: this.response
        };
    }
}
