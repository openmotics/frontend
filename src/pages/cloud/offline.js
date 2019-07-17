/*
 * Copyright (C) 2019 OpenMotics BVBA
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
import {Base} from '../../resources/base';
import {Refresher} from '../../components/refresher';

export class Offline extends Base {
    constructor(...rest) {
        super(...rest);
        this.refresher = new Refresher(async () => {
            if (this.shared.installation !== undefined) {
                await this.shared.installation.checkAlive(2000);
                if (this.shared.installation.alive) {
                    this.router.navigate('dashboard');
                }
            }

        }, 60000);
        this.installationsLoading = true;
    }

    // Aurelia
    attached() {
        super.attached();
    }

    activate() {
        this.refresher.run();
        this.refresher.start();
        if (this.shared.installation !== undefined) {
            this.shared.installation.checkAlive(2000);
        }
    }

    deactivate() {
        this.refresher.stop();
    }

    detached() {
    }
}