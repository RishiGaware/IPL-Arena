import logo201 from "../assets/sms-logo/201.png";
import logo202 from "../assets/sms-logo/202.png";
import logo203 from "../assets/sms-logo/203.png";
import logo204 from "../assets/sms-logo/204.png";
import logo205 from "../assets/sms-logo/205.png";
import logo206 from "../assets/sms-logo/206.png";
import logo207 from "../assets/sms-logo/207.png";
import logo208 from "../assets/sms-logo/208.png";
import logo209 from "../assets/sms-logo/209.png";
import logo210 from "../assets/sms-logo/210.png";

export const TEAM_LOGOS = {
  201: logo201,
  202: logo202,
  203: logo203,
  204: logo204,
  205: logo205,
  206: logo206,
  207: logo207,
  208: logo208,
  209: logo209,
  210: logo210,
};

export const TEAM_NAMES = {
  201: "Chennai Super Kings",
  202: "Delhi Capitals",
  203: "Gujarat Titans",
  204: "Kolkata Knight Riders",
  205: "Lucknow Super Giants",
  206: "Mumbai Indians",
  207: "Punjab Kings",
  208: "Royal Challengers Bangalore",
  209: "Rajasthan Royals",
  210: "Sunrisers Hyderabad",
};

export const TEAM_SHORT_NAMES = {
  201: "CSK",
  202: "DC",
  203: "GT",
  204: "KKR",
  205: "LSG",
  206: "MI",
  207: "PBKS",
  208: "RCB",
  209: "RR",
  210: "SRH",
};

/**
 * Returns the logo for a given team code
 * @param {string|number} code
 * @returns {string} Image path
 */
export const getTeamLogo = (code) => TEAM_LOGOS[code.toString()] || null;

/**
 * Returns the full name for a given team code
 * @param {string|number} code
 * @returns {string} Team name
 */
export const getTeamName = (code) =>
  TEAM_NAMES[code.toString()] || "Unknown Team";
