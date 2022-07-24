package org.hihn.ampd.server.controller;

import org.hihn.listenbrainz.ListenBrainzService;
import org.hihn.listenbrainz.lb.Listens;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/lb")
public class ListenBrainzController {

	private final ListenBrainzService listenBrainzService;

	public ListenBrainzController(ListenBrainzService listenBrainzService) {
		this.listenBrainzService = listenBrainzService;
	}

	@GetMapping(value = "/get-listens/{username}")
	public Listens getListens(@PathVariable String username) {
		return listenBrainzService.getListens(username)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

	@GetMapping(value = "/get-listens/{username}")
	public Listens getListens(@PathVariable String username, @RequestParam() int maxTs, @RequestParam() int minTs,
			@RequestParam() int count) {
		return listenBrainzService.getListens(username, maxTs, minTs, count)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

}
