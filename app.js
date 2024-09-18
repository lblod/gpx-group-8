import { app, query, sparqlEscapeString } from "mu";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import GPXParser from "gpxparser";

const STORAGE_FOLDER_PATH = "/share/";

app.get("/municipalities", async (req, res) => {
  const virtualFileUuid = req.query.id;
  if (!virtualFileUuid)
    return res.status(401).send("Request is missing 'id' query parameter.");

  const fileUriQuery = generateFileUriSelectQuery(virtualFileUuid);
  const fileUriResult = await query(fileUriQuery);
  const fileUriBindings = fileUriResult.results.bindings;
  if (fileUriBindings.length === 0) {
    return res.status(404).send("File for given id could not be found.");
  }
  const physicalFileUri = fileUriBindings[0].physicalFileUri.value;
  const filePath = physicalFileUri.replace("share://", STORAGE_FOLDER_PATH);
  if (!existsSync(filePath)) {
    return res
      .status(500)
      .send(
        "Could not find file in path. Check if the physical file is available on the server and if this service has the right mountpoint."
      );
  }
  const gpxString = await readFile(filePath, "utf-8");

  const gpx = new GPXParser();
  try {
    gpx.parse(gpxString);
  } catch (error) {
    console.error(error);
    return res.status(400).send("File for given id cannot be parsed as GPX.");
  }

  if (!gpx.tracks || gpx.tracks.length === 0) {
    return res.status(400).send("No tracks found in GPX file.");
  }

  const points = [];
  gpx.tracks.forEach((track) => {
    track.points.forEach((point) => {
      points.push({ lat: point.lat, lon: point.lon });
    });
  });

  const coarsenedPoints = coarsenPoints(points);

  // TODO: should be fetched from https://geo.api.vlaanderen.be/geolocation/v4/Location?latlon=50.84223%2C3.60332 (lat and long from gpx points)
  const hardcodedMunicipalities = [
    {
      postalCode: "9690",
      name: "Kluisbergen",
      uri: "http://data.lblod.info/id/bestuurseenheden/92fd2a12bdcc24f8e6ef34de765d54b3d7a0412b69c0877836cbe3098a5caf57>",
    },
    {
      postalCode: "9600",
      name: "Ronse",
      uri: " http://data.lblod.info/id/bestuurseenheden/59eaecae469f80eccaf6d36a165927eb8ee8749b9866ab1730e6b1ba45dfaaa7",
    },
    {
      postalCode: "9790",
      name: "Wortegem-Petegem",
      uri: "http://data.lblod.info/id/bestuurseenheden/4b93b99b2a80c6ce4e64850589a8c0163fc055b074b061a64add3e1af303f1fe",
    },
    {
      postalCode: "9700",
      name: "Oudenaarde",
      uri: "http://data.lblod.info/id/bestuurseenheden/d9f7c0ab4920fdecf3f9a60b92e921b5ca07248fcb0eac2113eb97392ddd6c6c",
    },
  ];

  return res.status(200).send(hardcodedMunicipalities);
});

function generateFileUriSelectQuery(virtualFileUuid) {
  return `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>

    SELECT ?virtualFileUri ?physicalFileUri
    WHERE {
      ?virtualFileUri mu:uuid ${sparqlEscapeString(virtualFileUuid)} .
      ?physicalFileUri nie:dataSource ?virtualFileUri .
    }`;
}

// GPX files naturally contain a very large amount of lat,long points
// We don't want to do too many API calls in next step --> we need to "coarsen"
function coarsenPoints(points) {
  // TODO: implement algorithm to "coarsen" points
  return points;
}
