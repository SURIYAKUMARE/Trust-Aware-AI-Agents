import os

KB_DOCS = [
    ("geography_paris.txt", "Geography: Paris is the capital and most populous city of France, situated along the Seine River in northern central France. It is an international center for culture, art, fashion, gastronomy, and science."),
    ("geography_tokyo.txt", "Geography: Tokyo is the capital and largest city of Japan. It is located at the head of Tokyo Bay on the Pacific coast of central Honshu."),
    ("geography_nile.txt", "Geography: The Nile River is generally regarded as the longest river in the world, flowing northwards through northeastern Africa into the Mediterranean Sea across 6,650 kilometers."),
    ("geography_everest.txt", "Geography: Mount Everest is Earth's highest mountain above sea level, located in the Mahalangur Himal sub-range of the Himalayas, with an official elevation of 8,848.86 meters."),
    ("geography_sahara.txt", "Geography: The Sahara is the largest hot desert in the world, covering an area of 9.2 million square kilometers across northern Africa."),
    
    ("physics_light.txt", "Physics: The speed of light in a vacuum is universally denoted as c and is exactly 299,792,458 meters per second."),
    ("physics_gravity.txt", "Physics: Earth's standard acceleration due to gravity at surface level is approximately 9.80665 meters per second squared (m/s^2)."),
    ("physics_thermo.txt", "Physics: The First Law of Thermodynamics states that energy cannot be created or destroyed, only transformed from one form to another."),
    ("physics_quantum.txt", "Physics: Planck's constant is approximately 6.62607015 x 10^-34 joule-seconds, establishing the fundamental quantum scale."),
    ("physics_absolute_zero.txt", "Physics: Absolute zero is 0 Kelvin or -273.15 degrees Celsius, representing the thermodynamic state where entropy reaches its minimum value."),

    ("biology_dna.txt", "Biology: Deoxyribonucleic acid (DNA) is a polymer composed of two polynucleotide chains that coil around each other to form a double helix carrying genetic instructions."),
    ("biology_photosynthesis.txt", "Biology: Photosynthesis is the process by which green plants and certain organisms transform light energy into chemical energy, synthesizing glucose and oxygen from carbon dioxide and water."),
    ("biology_mitochondria.txt", "Biology: Mitochondria are membrane-bound cell organelles that generate most of the chemical energy needed to power the cell's biochemical reactions via ATP."),
    ("biology_hemoglobin.txt", "Biology: Hemoglobin is the iron-containing oxygen-transport metalloprotein in red blood cells of almost all vertebrates."),
    ("biology_crispr.txt", "Biology: CRISPR-Cas9 is a molecular biological technology that enables precise genomic sequence editing within living organisms."),

    ("history_apollo11.txt", "History: Apollo 11 was the first crewed spaceflight mission that landed humans on the Moon on July 20, 1969, commanded by Neil Armstrong and lunar module pilot Buzz Aldrin."),
    ("history_ww2_end.txt", "History: World War II officially ended in September 1945 following the unconditional surrender of the Axis powers."),
    ("history_printing_press.txt", "History: Johannes Gutenberg developed the movable-type printing press in Mainz, Germany, around the year 1440."),
    ("history_magna_carta.txt", "History: Magna Carta was granted by King John of England at Runnymede near Windsor on June 15, 1215."),
    ("history_united_nations.txt", "History: The United Nations was founded on October 24, 1945, after the end of World War II, with 51 charter member states."),

    ("computing_turing.txt", "Computing: Alan Turing formalized the concepts of algorithm and computation with the invention of the universal Turing machine in 1936."),
    ("computing_transistor.txt", "Computing: The point-contact transistor was invented at Bell Labs in December 1947 by John Bardeen, Walter Brattain, and William Shockley."),
    ("computing_internet.txt", "Computing: ARPANET adopted TCP/IP protocols on January 1, 1983, marking the official technical establishment of the modern Internet."),
    ("computing_unicode.txt", "Computing: Unicode provides a unique number for every character across platforms, programs, and languages, supporting over 149,000 characters."),
    ("computing_rsa.txt", "Computing: RSA is an asymmetric public-key cryptosystem invented by Ron Rivest, Adi Shamir, and Leonard Adleman in 1977."),

    ("chemistry_water.txt", "Chemistry: Water consists of two hydrogen atoms bonded covalently to one oxygen atom (H2O), with a boiling point of 100 degrees Celsius at 1 atmosphere pressure."),
    ("chemistry_periodic.txt", "Chemistry: Dmitri Mendeleev formulated the Periodic Law and created the first widely recognized periodic table of chemical elements in 1869."),
    ("chemistry_gold.txt", "Chemistry: Gold is a noble transition metal with atomic number 79 and chemical symbol Au, highly resistant to oxidation and corrosion."),

    ("space_mars.txt", "Space: Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System, possessing two small moons: Phobos and Deimos."),
    ("space_jupiter.txt", "Space: Jupiter is the largest planet in our solar system, with a mass more than two and a half times that of all other planets combined."),

    ("sports_olympics.txt", "Sports: The ancient Olympic Games were held in Olympia, Greece, and the modern Olympic Games were revived in Athens in 1896."),
    ("sports_chess.txt", "Sports: Standard FIDE Chess Olympiads are held biannually in even years; as of 2026, no Chess Olympiad has been held for 2031.")
]

def seed_kb(target_dir="./backend/data/kb"):
    os.makedirs(target_dir, exist_ok=True)
    for fname, content in KB_DOCS:
        fpath = os.path.join(target_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content.strip() + "\n")
    print(f"Successfully seeded {len(KB_DOCS)} knowledge base documents into {target_dir}")

if __name__ == "__main__":
    seed_kb()
