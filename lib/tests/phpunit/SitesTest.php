<?php

namespace Wikibase\Test;
use Wikibase\Item as Item;
use Wikibase\Sites as Sites;
use Wikibase\Site as Site;

/**
 * Tests for the Wikibase\Sites class.
 *
 * @file
 * @since 0.1
 *
 * @ingroup Wikibase
 * @ingroup Test
 *
 * @group Wikibase
 * @group WikibaseLib
 * @group Sites
 *
 * @group Database
 *
 * @licence GNU GPL v2+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class SitesTest extends \MediaWikiTestCase {

	public function setUp() {
		parent::setUp();
		\Wikibase\Utils::insertSitesForTests();
	}

	public function testSingleton() {
		$this->assertInstanceOf( 'Wikibase\Sites', Sites::singleton() );
		$this->assertTrue( Sites::singleton() === Sites::singleton() );
	}

	public function testGetGlobalIdentifiers() {
		$this->assertTrue( is_array( Sites::singleton()->getGlobalIdentifiers() ) );
		$ids = Sites::singleton()->getGlobalIdentifiers();

		if ( $ids !== array() ) {
			$this->assertTrue( in_array( reset( $ids ), Sites::singleton()->getGlobalIdentifiers() ) );
		}

		$this->assertFalse( in_array( '4241413541354135435435413', Sites::singleton()->getGlobalIdentifiers() ) );
	}

	public function testGetGroup() {
		$allSites = Sites::singleton()->getAllSites();
		$count = 0;

		foreach ( $allSites->getGroupNames() as $groupName ) {
			$group = Sites::singleton()->getGroup( $groupName );
			$this->assertInstanceOf( '\Wikibase\SiteList', $group );
			$count += $group->count();

			if ( !$group->isEmpty() ) {
				$sites = iterator_to_array( $group );

				foreach ( array_slice( $sites, 0, 5 ) as $site ) {
					$this->assertInstanceOf( '\Wikibase\Site', $site );
					$this->assertEquals( $groupName, $site->getGroup() );
				}
			}
		}

		$this->assertEquals( $allSites->count(), $count );
	}

	public function testGetSite() {
		$count = 0;
		$sites = Sites::singleton()->getAllSites();

		foreach ( $sites as $site ) {
			$this->assertInstanceOf( '\Wikibase\Site', $site );

			$this->assertEquals(
				$site,
				Sites::singleton()->getSiteByGlobalId( $site->getGlobalId() )
			);

			if ( ++$count > 100 ) {
				break;
			}
		}
	}

	public function loadConditionsProvider() {
		return array(
			array( array( 'global_key' => 'enwiki' ), array( 'enwiki' ) ),
			array( array( 'global_key' => array( 'enwiki', 'dewiki' ) ), array( 'enwiki', 'dewiki' ) ),
			array( array( 'global_key' => array( 'enwiki', 'dewiki', 'xyzwiki' ) ), array( 'enwiki', 'dewiki' ) ),
			array( array( 'local_key' => 'en' ), array( 'enwiki' ) ),
			array( array( 'global_key' => 'zsdfszdrtgsdftyg' ), array() ),
			array( array( 'local_key' => 'sdrfsdatddertd' ), array() ),
			array( array( 'global_key' => 'enwiki', 'local_key' => 'en' ), array( 'enwiki' ) ),
			array( array(), null ),
		);
	}

	/**
	 * @dataProvider loadConditionsProvider
	 * @param array $conditions
	 */
	public function testLoadSites( array $conditions, $expected  ) {
		$sites = new TestSites();
		$sites->loadSites( $conditions );

		if ( !$expected ) {
			//don't check content
			$this->assertTrue( true, "just a dummy" );
			return;
		}

		$ids = array();
		foreach ( $sites->getSiteList() as $site /* @var Site $site */ ) {
			$ids[] = $site->getGlobalId();
		}

		$this->assertArrayEquals( $expected, $ids );
	}

	public function testGetSiteByLocalId() {
		$site = Sites::singleton()->getSiteByLocalId( "en" );
		$this->assertFalse( $site === false, "site not found" );
		$this->assertEquals( "en", $site->getConfig()->getLocalId() );
		$this->assertFalse( Sites::singleton()->getSiteByLocalId( 'dxzfzxdegxdrfyxsdty' ) );
	}

	public function testGetSiteByGlobalId() {
		$site = Sites::singleton()->getSiteByGlobalId( "enwiki" );
		$this->assertFalse( $site === false, "site not found" );
		$this->assertEquals( "enwiki", $site->getGlobalId() );
		$this->assertFalse( Sites::singleton()->getSiteByGlobalId( 'dxzfzxdegxdrfyxsdty' ) );
	}

	public function testGetLoadedSites() {
		$this->assertInstanceOf( '\Wikibase\SiteList', Sites::singleton()->getLoadedSites() );

		$this->assertEquals(
			Sites::singleton()->getAllSites(),
			Sites::singleton()->getLoadedSites()
		);
	}

	public function testNewSite() {
		$this->assertInstanceOf( 'Wikibase\Site', Sites::newSite() );
		$this->assertInstanceOf( 'Wikibase\Site', Sites::newSite( array() ) );
		$this->assertInstanceOf( 'Wikibase\Site', Sites::newSite( array( 'type' => SITE_TYPE_UNKNOWN ) ) );
	}

}

class TestSites extends Sites {
	public function __construct() {
		parent::__construct();
	}

	/**
	 * @return \Wikibase\SiteList
	 */
	public function getSiteList() {
		return $this->sites;
	}
}