/**
 * Guide Page Controller
 */

class GuidePage {
    constructor(app) {
        this.app = app;
        this.guidePlayer = new GuidePlayerController(app);
    }

    async init() {
        // EPG guide will lazy load when shown
    }

    showGuidePlayer(channel = null) {
        this.guidePlayer.show(channel);
    }

    closeGuidePlayer(options = {}) {
        if (options.stopPlayback) {
            this.guidePlayer.stop();
            return;
        }
        this.guidePlayer.hide({ allowRestore: options.allowRestore ?? true });
    }

    async show() {
        const channelList = this.app.channelList;
        if (!channelList.channels || channelList.channels.length === 0) {
            await channelList.loadSources();
            await channelList.loadChannels();
        }

        if (!this.app.epgGuide.programmes || this.app.epgGuide.programmes.length === 0) {
            await this.app.epgGuide.loadEpg();
        } else {
            this.app.epgGuide.render();
        }

        this.guidePlayer.onPageShow();
    }

    hide() {
        this.guidePlayer.onPageHide();
    }
}

window.GuidePage = GuidePage;