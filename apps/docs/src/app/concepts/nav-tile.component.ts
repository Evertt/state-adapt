import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TilesModule } from 'carbon-components-angular';

@Component({
  standalone: true,
  selector: 'state-adapt-nav-tile',
  imports: [CommonModule, TilesModule, RouterModule],
  template: `
    <ng-template #content><ng-content></ng-content></ng-template>
    <ibm-clickable-tile *ngIf="!right" class="left" [route]="[link]">
      <h3>
        Previous:
        <ng-container *ngTemplateOutlet="content"></ng-container>
      </h3>
    </ibm-clickable-tile>
    <ibm-clickable-tile *ngIf="right" class="right" [route]="[link]">
      <h3>
        Next:
        <ng-container *ngTemplateOutlet="content"></ng-container>
      </h3>
    </ibm-clickable-tile>
  `,
  styles: [
    `
      ibm-clickable-tile {
        width: calc(50% - 1em);
        margin-top: 3em;
      }
      .left {
        float: left;
      }
      .right {
        float: right;
      }
      h3 {
        margin-top: 0;
      }
    `,
  ],
})
export class NavTileComponent {
  @Input() link = '';
  @Input() right = false;
}
