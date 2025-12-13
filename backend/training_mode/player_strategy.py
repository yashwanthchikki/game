from player_class import Player

def starter_function(p, p1_hp, p2_hp, p1_ki, p2_ki, timer, p1_points, p2_points, p1_pos, p2_pos, my_pos):
    if p2_hp > 50:
        p.attack1()
    else:
        p.defend()
