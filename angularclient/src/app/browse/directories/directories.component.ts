import { Component, HostListener, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Directory } from '../../shared/messages/incoming/directory';
import { MpdCommands } from '../../shared/mpd/mpd-commands';
import { BrowseService } from '../../shared/services/browse.service';
import { NotificationService } from '../../shared/services/notification.service';
import { WebSocketService } from '../../shared/services/web-socket.service';

@Component({
  selector: 'app-directories',
  templateUrl: './directories.component.html',
  styleUrls: ['./directories.component.css'],
})
export class DirectoriesComponent {
  @Input() public dirQueue: Directory[] = [];
  public getParamDir = '/';

  constructor(
    private browseService: BrowseService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService
  ) {
    this.getParamDir =
      this.activatedRoute.snapshot.queryParamMap.get('dir') || '/';
  }

  @HostListener('click', ['$event'])
  public onPlayDir(dir: string): void {
    if (typeof dir !== 'string') {
      return;
    }
    this.onAddDir(dir);
    this.webSocketService.send(MpdCommands.SET_PLAY);
    this.notificationService.popUp(`Playing dir: "${dir}"`);
  }

  @HostListener('click', ['$event'])
  public onAddDir(dir: string): void {
    if (event) {
      event.stopPropagation();
    }
    if (typeof dir !== 'string') {
      return;
    }
    if (dir.startsWith('/')) {
      dir = dir.substr(1, dir.length);
    }
    this.webSocketService.sendData(MpdCommands.ADD_DIR, {
      dir,
    });
    this.notificationService.popUp(`Added dir: "${dir}"`);
  }

  @HostListener('click', ['$event'])
  public onDirClick(directory: string): void {
    if (event) {
      event.stopPropagation();
    }

    console.log(`Clicked on ${directory}`);

    this.browseService.sendBrowseReq(directory);
    this.router.navigate(['browse'], { queryParams: { dir: directory } });
  }
}