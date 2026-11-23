# Roshan
The web edition of the November Roshan Persian study application. Open [Roshan](./Roshan.html#home).
It includes the original course catalogue, pronunciation recordings, and timed Speed Reading with
100 passages, 300 questions and bilingual reviews.

The site uses browser storage for progress. Progress from a different offline or web origin does
not transfer automatically; use the built-in transfer tools where supported. Microphone access,
if used, prompts for permission. Installers, private local paths, and classroom report documents
are not part of this web edition. Vazirmatn is distributed with its
[Open Font License](./fonts/OFL.txt).


## Install and use offline

Open the real Roshan page while online and give the offline app setup time to finish.
The **Offline** menu shows when the app is ready and offers installation instructions.
In Chromium, use **Install Roshan** when available; on iPhone or iPad, open Roshan
in Safari and use **Share > Add to Home Screen**.

The approximately 74 MB app shell is prepared independently of the audio.
Reading and the app open offline after that preparation. To listen offline, explicitly
select **Download all audio** in the Offline menu. It prepares all 14,371 original
recordings (about 849 MB), verifies each file, and resumes from saved files after
a pause, closed tab, or connection problem. Keep the tab open while downloading.
Use a reliable connection and adequate device storage. Test offline before relying
on it: clearing site data or browser storage eviction can remove offline files.
External dictionary and source links still need internet access.

Removing only downloaded audio does not delete study progress. A UI update replaces
only the app-shell cache, not the completed audio pack. A future app-shell release
must bump the shell version in \`assets/pwa-shared.js\`; the audio pack version and
index should change only if the actual recording set changes.
