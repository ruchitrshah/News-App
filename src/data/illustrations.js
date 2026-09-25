// Default art for any news item without its own illustration — a news item
// you just created, or one the pipeline made. (Source: assets/illustrations/
// globe.png, resized to match the other 120px illustrations.)
export const DEFAULT_ILLUSTRATION = require('../../assets/illustrations/globe-120.png');

export const illustrationFor = (news) => news?.illustration ?? DEFAULT_ILLUSTRATION;
