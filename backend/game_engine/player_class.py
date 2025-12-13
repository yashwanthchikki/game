class Player:
    def __init__(self):
        self.hp = 100
        self.mana = 100
        self.ki = 0
        self.messages = []
    
    def attack1(self): self.messages.append("attack1")
    def attack2(self): self.messages.append("attack2")
    def attack3(self): self.messages.append("attack3")
    def defend(self): self.messages.append("defend")
    def run(self): self.messages.append("run")
    def runopp(self): self.messages.append("runopp")
    def runattack(self): self.messages.append("runattack")
    def push(self): self.messages.append("push")
    def use_card_small_hp(self): self.messages.append("use_card_small_hp")
    def use_card_big_hp(self): 
        self.messages.append("use_card_big_hp")
        self.messages.append("idle") # Consumes 2nd slot
    def use_card_small_mana(self): self.messages.append("use_card_small_mana")
    def use_card_big_mana(self): 
        self.messages.append("use_card_big_mana")
        self.messages.append("idle") # Consumes 2nd slot
    def idle(self): self.messages.append("idle")
    def cooldown(self): self.messages.append("idle")

    # Internal methods - these are placeholders as actual stat updates happen in the game engine
    def _update_hp(self, value): pass
    def _update_mana(self, value): pass
    def _update_ki(self, value): pass
