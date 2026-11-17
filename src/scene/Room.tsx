// The whole office. One component per object, so any of them can later be replaced by a modelled .glb.
import { useContext } from 'react';
import { CaseWall } from './objects/CaseWall';
import { Cabinet, EvidenceBox } from './objects/Cabinet';
import { CoatRack } from './objects/CoatRack';
import { Desk } from './objects/Desk';
import { Chair, DeskClutter, DeskFolders, DossierFolder } from './objects/DeskProps';
import { EvidenceBoard } from './objects/EvidenceBoard';
import { Cat } from './objects/Cat';
import { Floor } from './objects/Floor';
import { Gramophone } from './objects/Gramophone';
import { Lamp } from './objects/Lamp';
import { Dust, Lights } from './objects/Atmosphere';
import { Telephone, Typewriter } from './objects/Typewriter';
import { Walls } from './objects/Walls';
import { Commendations, Diploma } from './objects/WallPieces';
import { Window } from './objects/Window';
import { QualityContext } from './quality';
import { Swappable } from './Swappable';

export function Room() {
  const quality = useContext(QualityContext);
  return (
    <>
      <color attach="background" args={['#07080c']} />
      <fogExp2 attach="fog" args={['#07080c', 0.026]} />
      <Lights />
      {/* the shell */}
      <Swappable model="room-shell">
        <Floor />
        <Walls />
      </Swappable>
      <Window />
      <Cat />
      <CoatRack />
      {/* the desk and what is on it */}
      <Desk />
      <Chair />
      <Lamp />
      <Typewriter />
      <Telephone />
      <DeskFolders />
      <DossierFolder />
      <DeskClutter />
      {/* the walls of evidence */}
      <CaseWall />
      <EvidenceBoard />
      <Commendations />
      <Diploma />
      <Cabinet />
      <EvidenceBox />
      <Gramophone />
      {quality !== 'low' && <Dust />}
    </>
  );
}
