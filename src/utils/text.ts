import { IntlShape } from "react-intl";

// Typescript currently does not implement the intl Unit interface
type Unit =
  | "byte"
  | "kilobyte"
  | "megabyte"
  | "gigabyte"
  | "terabyte"
  | "petabyte";
const Units: Unit[] = [
  "byte",
  "kilobyte",
  "megabyte",
  "gigabyte",
  "terabyte",
  "petabyte",
];
const shortUnits = ["B", "KB", "MB", "GB", "TB", "PB"];

const fileSize = (bytes: number = 0) => {
  if (Number.isNaN(parseFloat(String(bytes))) || !Number.isFinite(bytes))
    return { size: 0, unit: Units[0] };

  let unit = 0;
  let count = bytes;
  while (count >= 1024 && unit + 1 < Units.length) {
    count /= 1024;
    unit++;
  }

  return {
    size: count,
    unit: Units[unit],
  };
};

const formatFileSizeUnit = (u: Unit) => {
  const i = Units.indexOf(u);
  return shortUnits[i];
};

const secondsToTimestamp = (seconds: number) => {
  let ret = new Date(seconds * 1000).toISOString().substr(11, 8);

  if (ret.startsWith("00")) {
    // strip hours if under one hour
    ret = ret.substr(3);
  }
  if (ret.startsWith("0")) {
    // for duration under a minute, leave one leading zero
    ret = ret.substr(1);
  }
  return ret;
};

const fileNameFromPath = (path: string) => {
  if (!!path === false) return "No File Name";
  return path.replace(/^.*[\\/]/, "");
};

const getAge = (dateString?: string | null, fromDateString?: string) => {
  if (!dateString) return 0;

  const birthdate = new Date(dateString);
  const fromDate = fromDateString ? new Date(fromDateString) : new Date();

  let age = fromDate.getFullYear() - birthdate.getFullYear();
  if (
    birthdate.getMonth() > fromDate.getMonth() ||
    (birthdate.getMonth() >= fromDate.getMonth() &&
      birthdate.getDay() > fromDate.getDay())
  ) {
    age -= 1;
  }

  return age;
};

const bitRate = (bitrate: number) => {
  const megabits = bitrate / 1000000;
  return `${megabits.toFixed(2)} megabits per second`;
};

const resolution = (width: number, height: number) => {
  const number = width > height ? height : width;
  if (number >= 4320) {
    return "8K";
  }
  if (number >= 3384) {
    return "6K";
  }
  if (number >= 2880) {
    return "5K";
  }
  if (number >= 2160) {
    return "4K";
  }
  if (number >= 1920) {
    return "1920p";
  }
  if (number >= 1440) {
    return "1440p";
  }
  if (number >= 1080) {
    return "1080p";
  }
  if (number >= 720) {
    return "720p";
  }
  if (number >= 540) {
    return "540p";
  }
  if (number >= 480) {
    return "480p";
  }
  if (number >= 360) {
    return "360p";
  }
  if (number >= 240) {
    return "240p";
  }
  if (number >= 144) {
    return "144p";
  }
};

const twitterURL = new URL("https://www.twitter.com");
const instagramURL = new URL("https://www.instagram.com");

const sanitiseURL = (url?: string, siteURL?: URL) => {
  if (!url) {
    return url;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    // just return the entire URL
    return url;
  }

  if (siteURL) {
    // if url starts with the site host, then prepend the protocol
    if (url.startsWith(siteURL.host)) {
      return `${siteURL.protocol}//${url}`;
    }

    // otherwise, construct the url from the protocol, host and passed url
    return `${siteURL.protocol}//${siteURL.host}/${url}`;
  }

  // just prepend the protocol - assume https
  return `https://${url}`;
};

const formatDate = (intl: IntlShape, date?: string) => {
  if (!date) {
    return "";
  }

  return intl.formatDate(date, { format: "long", timeZone: "utc" });
};

const TextUtils = {
  fileSize,
  formatFileSizeUnit,
  secondsToTimestamp,
  fileNameFromPath,
  age: getAge,
  bitRate,
  resolution,
  sanitiseURL,
  twitterURL,
  instagramURL,
  formatDate,
};

export default TextUtils;
