/*
 * Copyright (C) 2018 OpenMotics BVBA
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import {computedFrom, Container} from 'aurelia-framework';
import {BaseObject} from './baseobject';
import {I18N} from 'aurelia-i18n';
import {Toolbox} from '../components/toolbox';
import {Logger} from '../components/logger';

export class Installation extends BaseObject {
    constructor(...rest /*, id */) {
        let id = rest.pop();
        super(...rest);
        this.id = id;
        this.i18n = Container.instance.get(I18N);
        this.key = 'id';
        this.name = undefined;
        this.role = undefined;
        this.version = undefined;
        this.uuid = undefined;
        this.alive = undefined;
        this.registrationKey = undefined;
        this.aliveLoading = false;
        this.flags = {};
        this.checked = false;
        this._edit = false;

        this.mapping = {
            id: 'id',
            name: 'name',
            registrationKey: 'registration_key',
            role: [['user_role'], userRole => {
                return userRole.role;
            }],
            version: 'version',
            uuid: 'uuid',
            flags: 'flags'
        };
    }

    async checkAlive(timeout) {
        try {
            this.aliveLoading = true;
            await this.api.getFeatures({
                ignoreConnection: true,
                installationId: this.id,
                timeout: timeout
            });
            this.alive = true;
        } catch (error) {
            this.alive = false;
        } finally {
            this.aliveLoading = false;
        }
    }

    async populate(data){
        this.fillData(data);
    }

    async save() {
        try {
            this.edit = false;
            await this.api.updateInstallation(
                this.id,
                this.name
            );
        } catch (error) {
            Logger.error(`Could not set Installation name ${this.name}: ${error.message}`);
        }
    }


    @computedFrom('flags')
    get updateLoading() {
        return this.flags.hasOwnProperty('UPDATING');
    }

    @computedFrom('flags')
    get status() {
        return this.flags.hasOwnProperty('UPDATING') ? this.i18n.tr('generic.updating') : this.flags.hasOwnProperty('BACKING_UP') ? this.i18n.tr('generic.backingup') : this.flags.hasOwnProperty('RESTORING') ? this.i18n.tr('generic.restoring') : '';
    }

    @computedFrom('flags')
    get hasUpdate() {
        return this.flags.hasOwnProperty('UPDATE_AVAILABLE');
    }

    @computedFrom('flags')
    get isBusy() {
        return this.flags.hasOwnProperty('BACKING_UP') || this.flags.hasOwnProperty('RESTORING') || this.flags.hasOwnProperty('UPDATING');
    }

    @computedFrom('registrationKey')
    get shortRegistrationKey() {
        return [null, undefined].contains(this.registrationKey) ? null : Toolbox.shorten(this.registrationKey, 12, false);
    }
}
