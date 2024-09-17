import { app, query, sparqlEscapeString } from "mu";
import { existsSync } from "fs";

const STORAGE_FOLDER_PATH = "/share/";

app.get("/municipalities", async (req, res) => {
  const virtualFileUuid = req.query.id;
  if (!virtualFileUuid)
    return res.status(401).send("Request is missing 'id' query parameter.");

  const fileUriQuery = generateFileUriSelectQuery(virtualFileUuid);
  const fileUriResult = await query(fileUriQuery);
  const fileUriBindings = fileUriResult.results.bindings;
  if (fileUriBindings.length === 0) {
    return res.status(404).send("Not Found");
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

  // TODO: should be fetched from https://geo.api.vlaanderen.be/geolocation/v4/Location?latlon=50.84223%2C3.60332 (lat and long from gpx points)
  const hardcodedMunicipalities = [
    { postalCode: "9690", name: "Kluisbergen" },
    { postalCode: "9600", name: "Ronse" },
    { postalCode: "9790", name: "Wortegem-Petegem" },
    { postalCode: "9700", name: "Oudenaarde" },
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
