import {Component, OnInit} from '@angular/core';
import {LoadingController, NavController} from '@ionic/angular';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';

import {AuthenticateService} from '../../services/authentication/authentication.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.page.html',
    styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {

    loginForm: FormGroup;
    errorMessage = '';
    successMessage = '';

    validationMessages = {
        email: [
            {type: 'required', message: 'Email is required.'},
            {type: 'pattern', message: 'Enter a valid email.'}
        ],
        password: [
            {type: 'required', message: 'Password is required.'},
            {type: 'minlength', message: 'Password must be at least 5 characters long.'}
        ],
    };

    constructor(
        private navCtrl: NavController,
        private authService: AuthenticateService,
        private formBuilder: FormBuilder,
        private loadingController: LoadingController
    ) {
    }

    ngOnInit() {
        this.loginForm = this.formBuilder.group({
            email: new FormControl('', Validators.compose([
                Validators.required,
                Validators.pattern('^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$')
            ])),
            password: new FormControl('', Validators.compose([
                Validators.minLength(5),
                Validators.required
            ])),
        });
    }

    async tryLogin(value) {
        const loading = await this.loadingController.create({
            cssClass: 'my-custom-class',
            message: 'Loading...',
            duration: 2000
        });

        this.authService.loginUser(value)
            .then(res => {
                console.log(res);
                loading.dismiss();
                this.errorMessage = '';
                this.successMessage = 'Login was successful';
                this.navCtrl.navigateForward('/menu/dashboard');
                this.loginForm.reset();
            }, err => {
                console.log(err);
                loading.dismiss();
                this.errorMessage = err.message;
                this.successMessage = '';
            });
    }

    goToRegisterPage() {
        this.navCtrl.navigateForward('/registration');
    }

}


