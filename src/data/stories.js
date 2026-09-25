// Today's news. Each item is one pill in the top rail and holds the
// explainers ("stories") made about it — the pill's border has one segment
// per story. Shaped the way the generation pipeline will hand it over; when
// the backend lands this module is replaced by a fetch.
//
// news.label:          two-word name for the pill ("Fed rates").
// news.illustration:   Thiings 3D icon (thiings.co — free tier, non-commercial,
//                      attribution required).
// story.status:        'ready' (video + captions) | 'generating'.
// story.captions[]:    { start, end, text } in seconds of video time.
//
// No news ships with the app: every item comes from the pipeline (loaded
// from the server's library on launch, or made with + / the mic).
export const NEWS = [];

export const isReady = (story) => story.status !== 'generating';
