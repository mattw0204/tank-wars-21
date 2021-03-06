class TankScene extends Phaser.Scene {
    
    /** @type {Phaser.Tilemaps.Tilemap} */
    map
    /** @type {Phaser.Tilemaps.TilemapLayer} */
    destructLayer
    /** @type {PlayerTank} */
    player
    /** @type {Array.<EnemyTank>} */
    enemyTanks = []
    /** @type {Phaser.Physics.Arcade.Group} */
    bullets
    /** @type {Phaser.Physics.Arcade.Group} */
    enemyBullets
    /** @type {Phaser.GameObjects.Group} */
    explosions
    /** @type {Phaser.GameObjects.Text} */
    HPUI
    /** @type {Phaser.GameObjects.Text} */
    ECUI
    /** @type {Phaser.GameObjects.Text} */
    AmmoUI
    /** @type {Phaser.GameObjects.Text} */
    ScoreUI
    /** @type {number} */
    HP = 10
    /** @type {number} */
    Score = 0
    /** @type {number} */
    enemyCount = 0
    /** @type {number} */
    ammoCount = 5
    /** @type {number} */
    ammoTotal = 99
    
        
    
    preload() {
        this.load.image('bullet', 'assets/tanks/bullet.png')
        this.load.image('uioverlay','assets/UIOverlay.png')
        this.load.atlas('tank','assets/tanks/tanks.png','assets/tanks/tanks.json')
        this.load.atlas('boss','assets/tanks/boss-tanks.png','assets/tanks/tanks.json')
        this.load.atlas('enemy','assets/tanks/enemy-tanks.png','assets/tanks/tanks.json')
        this.load.image('tileset', 'assets/tanks/landscape-tileset.png')
        this.load.tilemapTiledJSON('level1', 'assets/level1.json')
        this.load.spritesheet('kaboom','assets/tanks/explosion.png',{
            frameWidth:64,frameHeight:64
        
        })
        this.load.audio('CannonFire', 'assets/CannonFire.mp3')
        this.load.audio('Explosion', 'assets/Explosion.mp3')
        this.load.audio('PlayerHit', 'assets/PlayerHit.mp3')
        this.load.audio('WallHit', 'assets/WallHit.mp3')
        this.load.audio('BloodyPirates','assets/BloodyPirates.mp3')
        
        
    }
    create() {
        
        this.add.image(750, 350, 'uioverlay').setScrollFactor(0, 0).setDepth(6)
        
        this.map = this.make.tilemap({key:'level1'})
        const landscape = this.map.addTilesetImage('landscape-tileset','tileset')
        this.map.createLayer('groundLayer',[landscape], 0, 0)
        this.destructLayer = this.map.createLayer('destructableLayer',[landscape],0,0)
        this.destructLayer.setCollisionByProperty({collides:true})
        this.cameras.main.setBounds(0,0,this.map.widthInPixels,this.map.heightInPixels)
        this.physics.world.setBounds(0,0, this.map.widthInPixels,this.map.heightInPixels)
        //create bullets
        this.enemyBullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 10
        })
        this.bullets = this.physics.add.group({

            defaultKey: 'bullet',
            maxSize: 5
            
        })
       


        const objectLayer = this.map.getObjectLayer('objectLayer')
        let enemyObjects = []
        let actor 
        objectLayer.objects.forEach(function(object){
            actor = Utils.RetrieveCustomProperties(object)
            if(actor.type == "playerSpawn"){
                this.createPlayer(actor)
            }
            else if(actor.type == "enemySpawn"||actor.type == "bossSpawn"){
                enemyObjects.push(actor)
            }

        }, this)
        this.cameras.main.startFollow(this.player.hull, true, 0.25,0.25)
        for(let i = 0; i < enemyObjects.length; i++){
            this.enemyCount++
            this.createEnemy(enemyObjects[i])
        }
        //create explosions
        this.explosions = this.add.group ({
            defaultKey: 'kaboom',
            maxSize: enemyObjects.length + 1
        })
        this.anims.create({
            key: 'explode',
            frames: this.anims.generateFrameNumbers('kaboom', {
                start: 0,
                end:23,
                first:23
            }),
            frameRate:24
        })
        this.input.on('pointerdown', this.tryShoot, this)
        this.physics.world.on('worldbounds', function(body){
            this.disposeOfBullet(body.gameObject)
        }, this)
        this.music()
        //ui setup
        //hull points
        let HPStr = ('Hull Points: '+this.HP)
        this.HPUI = this.add.text(600, 645, HPStr, {
            fontSize: '30px',
            color: '#FFF',
            fontFamily: 'Book-Antiqua'
        }).setScrollFactor(0, 0).setDepth(6)
        this.HPUI.setText(HPStr)
        //enemycount
        let ECStr = ('Enemies Left: '+this.enemyCount)
        this.ECUI = this.add.text(100, 645, ECStr, {
            fontSize: '30px',
            color: '#FFF',
            fontFamily: 'Book-Antiqua'
        }).setScrollFactor(0, 0).setDepth(6)
        this.ECUI.setText(ECStr)
        //ammocount
        let AmmoStr = ('Cannon Shots '+this.ammoCount+'/'+this.ammoTotal)
        this.AmmoUI = this.add.text(1200, 645, AmmoStr, {
            fontSize: '30px',
            color: '#FFF',
            fontFamily: 'Book-Antiqua'
        }).setScrollFactor(0, 0).setDepth(6)
        this.AmmoUI.setText(AmmoStr)
        //hull points
        let ScoreStr = ('Score: '+this.Score)
        this.ScoreUI = this.add.text(600, 10, ScoreStr, {
            fontSize: '30px',
            color: '#FFF',
            fontFamily: 'Book-Antiqua'
        }).setScrollFactor(0, 0).setDepth(6)
        this.ScoreUI.setText(ScoreStr)
        this.music()
    }
    update(time, delta) {
        this.player.update()
        for(let i = 0; i < this.enemyTanks.length; i++){
            this.enemyTanks[i].update(time, delta)
        }
    }
    createEnemy(dataObject){
        let enemyTank
        if(dataObject.type == 'enemySpawn'){
            enemyTank = new EnemyTank(this, dataObject.x,dataObject.y,'enemy','tank1', this.player)
            
        }else if(dataObject.type == 'bossSpawn'){
            enemyTank = new BossTank(this, dataObject.x,dataObject.y,'boss','tank1', this.player)
        }
       
          enemyTank.initMovement()
        enemyTank.enableCollision(this.destructLayer)
        enemyTank.setBullets(this.enemyBullets)
        this.physics.add.collider(enemyTank.hull,this.player.hull)
        this.enemyTanks.push(enemyTank)
        if(this.enemyTanks.length>1){
            for(let i = 0; i< this.enemyTanks.length - 1; i++){
                this.physics.add.collider(enemyTank.hull, this.enemyTanks[i].hull)
                
                
            }
        }
    }
    createPlayer(dataObject){
        this.player = new PlayerTank(this, dataObject.x,dataObject.y,'tank','tank1')
        this.player.enableCollision(this.destructLayer)
    }
    tryShoot(pointer){
        /** @type {Phaser.Physics.Arcade.Sprite} */
        let bullet = this.bullets.get(this.player.turret.x, this.player.turret.y)
        
        if(bullet&&this.ammoCount>0){
            this.fireBullet(bullet, this.player.turret.rotation, this.enemyTanks)
            this.ammoCount--
        let AmmoStr = ('Cannon Shots '+this.ammoCount+'/'+this.ammoTotal)
        this.AmmoUI.setText(AmmoStr) 
        this.Score -=10
        let ScoreStr = ('Score: '+this.Score)
        this.ScoreUI.setText(ScoreStr)
        }
    }
    fireBullet(bullet, rotation, target){
        //the bullet is a sprite :)
        
        bullet.setDepth(3)
        bullet.body.collideWorldBounds = true
        bullet.body.onWorldBounds = true
        bullet.enableBody(false, bullet.x, bullet.y, true, true)
        bullet.rotation = rotation
        this.physics.velocityFromRotation(bullet.rotation, 500, bullet.body.velocity)
        this.physics.add.collider(bullet, this.destructLayer, this.damageWall,null, this)

        if(target === this.player){
            this.physics.add.overlap(this.player.hull,bullet, this.bulletHitPlayer,null,this)
            

        }else
        
        {for(let i = 0; i < this.enemyTanks.length; i++){
            this.physics.add.overlap(this.enemyTanks[i].hull, bullet, this.bulletHitEnemy, null, this)
            this.bulletHitEnemy,null,this}
        }
        let Cannonfire = this.sound.add('CannonFire', {volume: 0.4})
        Cannonfire.play()
        

    }
    bulletHitPlayer(hull, bullet,damageMax,damageCount,HP){
        this.disposeOfBullet(bullet)
        this.player.damage()
        if(this.player.isDestroyed()){
            this.input.enabled = false
            this.enemyTanks = []
            this.physics.pause()
            let explosion = this.explosions.get(hull.x, hull. y)
            if(explosion){
                this.activateExplosion(explosion)
                explosion.play('explode')
            }
        }
        let PlayerHit = this.sound.add('PlayerHit', {volume: 0.4})
        this.HP-=1
        let HPStr = ('Hull Points: '+this.HP)
        this.HPUI.setText(HPStr) 
        PlayerHit.play()
        

    }
    bulletHitEnemy(hull, bullet){
        /** @type {EnemyTank} */
        let enemy
        /** @type {number} */
        let index
        for(let i = 0; i < this.enemyTanks.length; i++){
            if(this.enemyTanks[i].hull === hull){
                enemy = this.enemyTanks[i]
                index = i
                break
            }
        }
        this.disposeOfBullet(bullet)
        enemy.damage()
        this.Score +=15
        let ScoreStr = ('Score: '+this.Score)
        if(enemy.isImmobilised()){
            let explosion = this.explosions.get(hull.x,hull.y)
            if(explosion){
                this.activateExplosion(explosion)
                explosion.on('animationComplete',this.animComplete,this)
                explosion.play('explode')
                this.Score +=30
                let ScoreStr = ('Score: '+this.Score)
            }
            if(enemy.isDestroyed()){
                this.enemyTanks.splice(index, 1)
                this.Score +=45
                let ScoreStr = ('Score: '+this.Score)
                this.enemyCount--
                let ECStr = ('Enemies Left: '+this.enemyCount)
                this.ECUI.setText(ECStr)
                if(this.enemyCount===0){
                    
                }
            }
        this.ScoreUI.setText(ScoreStr)
        }
        let Explosion = this.sound.add('Explosion', {volume: 0.4})
        Explosion.play()
        
    
    }
    activateExplosion(explosion){
        explosion.setDepth(5)
        explosion.setActive(true)
        explosion.setVisible(true)
    }
    damageWall(bullet, tile){
        this.disposeOfBullet(bullet)
        let  firstGid = this.destructLayer.tileset[0].firstgid
        let nextTileId = tile.index + 1 - firstGid
        let tileProperties = this.destructLayer.tileset[0].tileProperties[nextTileId]
        let newTile = this.destructLayer.putTileAt(nextTileId + firstGid, tile.x, tile.y)
        if(tileProperties&&tileProperties.collides){
            newTile.setCollision(true)
        }
        let WallHit = this.sound.add('WallHit', {volume: 0.4})
        WallHit.play()

    }
    disposeOfBullet(bullet){
        if (this.ammoTotal>0){
        this.ammoCount++
        this.ammoTotal--}
        if (this.ammoCount>5){
            this.ammoCount=5
        }
        let AmmoStr = ('Cannon Shots '+this.ammoCount+'/'+this.ammoTotal)
        this.AmmoUI.setText(AmmoStr) 
        
        bullet.disableBody(true, true)
    }
    animComplete(animation, frame, gameObject){
        this.explosions.killAndHide(gameObject)

    }
    music() {
        let config = {
            type: Phaser.AUTO,
            parent: 'TankScene',
            width: 0,
            height: 0,
            pixelArt: true,
            scene: {
                preload: preload,
                create: create
            }
        };
        let game = new Phaser.Game(config);
        function preload() {
            this.load.audio('theme', [
                'assets/BackgroundMusic.mp3'
            ])
            this.load.audio('BloodyPirates', [
                'assets/BloodyPirates.mp3'
            ])
        }

        function create() {
            let music = this.sound.add('theme')
            music.loop = true
            music.play();
            let intro = this.sound.add('BloodyPirates')
            intro.play();
        }
    }
    
    
    
}