import { CAVE_COPY } from "../content/cave-copy";
import { game } from "../game/gameRef";
import { Icon } from "./icons";

export default function CaveEnding() {
  const invitation = CAVE_COPY.ending.oak;
  const walk = () => {
    game?.closeConversation();
    game?.autoWalkToObjective("objective");
  };
  return <div className="ended-destination cave-ending">
    <span className="place-ico"><Icon name="walk" size={20} /></span>
    <div>
      <b lang="en">{invitation.en}</b>
      <small lang="lt">{invitation.lt}</small>
    </div>
    {!game?.light && game?.cave && <button type="button" className="btn soft" onClick={walk}>
      <Icon name="walk" size={18} /> Nuvesk mane
    </button>}
  </div>;
}
