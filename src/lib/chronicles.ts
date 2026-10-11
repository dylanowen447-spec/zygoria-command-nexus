import ch1 from "@/assets/chapter-1.webp.asset.json";
import ch2 from "@/assets/chapter-2.webp.asset.json";
import longWalkBattle from "@/assets/long-walk-battle.webp";
import ch4 from "@/assets/chapter-4.webp.asset.json";

/** The First Genesis comic chapters, in story order. The Sanctuary world is Chapter 4. */
export const CHRONICLES = [
  { n: 1, title: "Three Eggs", img: ch1.url, text: "Three strange eggs fell through the dead sky and came to rest in the ruins of Old Earth. When the shells cracked open, Oz, Brix and Lowkey stepped out into silence." },
  { n: 2, title: "Old City", img: ch2.url, text: "Drawn by silent towers and strange markings, the Zigs entered Old City. In a crumbling library they found books and symbols they could somehow read — and a question they could not forget: what had happened to this world?" },
  { n: 3, title: "The Long Walk", img: longWalkBattle, text: "With nothing left in Old City, they crossed dead roads and broken hills searching for water — until they found a broad flat place by a curving river, with mountains watching from behind." },
  { n: 4, title: "Finding Home", img: ch4.url, text: "By the river they built a rough two-storey shack — their first real home. Brix made a workshop, Oz filled it with noise, and Lowkey kept watch from the moonlit ridge." },
];
