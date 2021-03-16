import { Component } from "@angular/core";
import { MpdModesPanel } from "../../shared/messages/incoming/mpd-modes-panel";
import { MpdService } from "../../shared/services/mpd.service";
import { MpdModeService } from "../../shared/services/mpd-mode.service";

@Component({
  selector: "app-mpd-modes",
  templateUrl: "./mpd-mode.component.html",
  styleUrls: ["./mpd-mode.component.scss"],
})
export class MpdModeComponent {
  mpdModesPanel: MpdModesPanel;
  private currentState = "stop";

  constructor(
    private mpdModeService: MpdModeService,
    private mpdService: MpdService
  ) {
    this.mpdModesPanel = mpdService.initEmptyControlPanel();
    this.mpdService.controlPanel.subscribe(
      (panel) => (this.mpdModesPanel = panel)
    );
    this.mpdService.currentState.subscribe(
      (state) => (this.currentState = state)
    );
  }

  toggleCtrl(key: string): void {
    this.mpdModeService.toggleCtrl(key);
  }
}
