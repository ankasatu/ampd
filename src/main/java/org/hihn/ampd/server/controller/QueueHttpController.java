package org.hihn.ampd.server.controller;

import org.bff.javampd.file.MPDFile;
import org.bff.javampd.playlist.MPDPlaylistSong;
import org.bff.javampd.server.MPD;
import org.hihn.ampd.server.message.incoming.AddPlayAlbum;
import org.hihn.ampd.server.message.incoming.MoveTrackMsg;
import org.hihn.ampd.server.model.AmpdSettings;
import org.hihn.ampd.server.model.QueuePageImpl;
import org.hihn.ampd.server.service.QueueService;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;

@RestController
@RequestMapping("/api/queue")
public class QueueHttpController {

	private final MPD mpd;

	private final AmpdSettings ampdSettings;

	private final QueueService queueService;

	/**
	 * Endpoint that provides access to the MPD queue.
	 * @param mpd Represents a connection to a MPD server.
	 * @param ampdSettings Settings of this ampd instance.
	 * @param queueService Service to manage the queue.
	 */
	public QueueHttpController(MPD mpd, AmpdSettings ampdSettings, QueueService queueService) {
		this.mpd = mpd;
		this.ampdSettings = ampdSettings;
		this.queueService = queueService;
	}

	@GetMapping("/")
	public QueuePageImpl<MPDPlaylistSong> getQueue() {
		return queueService.getQueue();
	}

	@GetMapping("/page")
	public QueuePageImpl<MPDPlaylistSong> getPage(PageEvent pageEvent) {
		return queueService.getQueue(pageEvent.getPageIndex(), pageEvent.getPageSize());
	}

	/**
	 * Removes all tracks from the queue.
	 */
	@DeleteMapping("/clear")
	public void clearQueue() {
		mpd.getPlaylist().clearPlaylist();
		if (ampdSettings.isResetModesOnClear()) {
			mpd.getPlayer().setRandom(false);
			mpd.getPlayer().setRepeat(false);
			mpd.getPlayer().setXFade(0);
			mpd.getPlayer().setConsume(false);
			mpd.getPlayer().setSingle(false);
		}
	}

	@PostMapping("/add-tracks")
	public void addTracks(@RequestBody ArrayList<String> tracks) {
		queueService.addTracks(tracks);
	}

	@PostMapping("/add-dir")
	public void addDir(@RequestBody String dir) {
		mpd.getPlaylist().addFileOrDirectory(MPDFile.builder(dir).directory(true).build());
	}

	@PostMapping("/add-album")
	public void addAlbum(@RequestBody AddPlayAlbum addPlayAlbum) {
		queueService.addAlbum(addPlayAlbum);
	}

	@PutMapping("/play-album")
	public void addPlayAlbum(@RequestBody AddPlayAlbum addPlayAlbum) {
		queueService.addPlayAlbum(addPlayAlbum);
	}

	/**
	 * Adds all tracks from a playlist to the queue.
	 * @param playlist The name of the playlist.
	 */
	@PostMapping("/add-playlist")
	public void addPlaylist(@RequestBody String playlist) {
		queueService.addPlaylist(playlist);
	}

	@PostMapping("/add-play-track")
	public void addPlayTrack(@RequestBody String file) {
		queueService.addTrack(file);
		queueService.playTrack(file);
	}

	@DeleteMapping("/remove-track")
	public void removeTrack(@RequestParam int position) {
		mpd.getPlaylist().removeSong(position);
	}

	@PutMapping("/play-track")
	public void playTrack(@RequestBody String file) {
		queueService.playTrack(file);
	}

	@PutMapping("/move-track")
	public void moveTrack(@RequestBody MoveTrackMsg moveTrackMsg) {
		queueService.moveTrack(moveTrackMsg.getOldPos(), moveTrackMsg.getNewPos());
	}

	public static final class PageEvent {

		private int pageIndex;

		private int pageSize;

		public int getPageIndex() {
			return pageIndex;
		}

		public void setPageIndex(int pageIndex) {
			this.pageIndex = pageIndex;
		}

		public int getPageSize() {
			return pageSize;
		}

		public void setPageSize(int pageSize) {
			this.pageSize = pageSize;
		}

	}

}
